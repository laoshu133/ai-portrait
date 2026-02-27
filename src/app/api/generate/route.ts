import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadToR2 } from '@/lib/r2';

export const runtime = 'nodejs';
export const maxDuration = 120;

function extractBase64ImageFromResponse(content: any): string | null {
  // Check if content is an array (Gemini returns multiple parts)
  if (Array.isArray(content)) {
    for (const part of content) {
      // Gemini format: { data: "base64...", mime_type: "image/png" }
      if (part.data && part.mime_type?.startsWith('image/')) {
        return part.data;
      }
      if (part.inlineData) {
        return part.inlineData.data;
      }
      if (part.type === 'image_url' && part.image_url?.url) {
        const url = part.image_url.url;
        if (url.startsWith('data:image/')) {
          return url.split(',')[1];
        }
        return url;
      }
    }
  }
  // Check OpenAI chat format
  if (typeof content === 'string') {
    // Look for base64 image data
    const base64Match = content.match(/data:image\/[a-zA-Z0-9]+;base64,([A-Za-z0-9+/=]+)/);
    if (base64Match) {
      return base64Match[1];
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in', code: 'NO_USER_ID' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const image = formData.get('image') as File;
    const type = (formData.get('type') as string) || 'id';
    const lang = (formData.get('lang') as string) || 'zh';

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Input = buffer.toString('base64');
    const mimeType = image.type || 'image/jpeg';
    const imageDataUrl = 'data:' + mimeType + ';base64,' + base64Input;

    const prompts: Record<string, string> = {
      id: lang === 'zh' 
        ? '基于这张照片，生成一张正式的证件照，蓝色背景，穿着正装，面带微笑，保持人物特征不变。'
        : 'Based on this photo, generate a formal ID photo with blue background, business attire, smiling, keep the original person features.',
      festival: lang === 'zh'
        ? '基于这张照片，生成一张喜庆节日照片，红色喜庆背景，温暖的笑容，保持人物特征不变。'
        : 'Based on this photo, generate a festive celebration photo with celebratory red background, warm smile, keep the original person features.',
      memorial: lang === 'zh'
        ? '基于这张照片，生成一张庄重的黑白纪念肖像，严肃的表情，经典风格，保持人物特征不变。'
        : 'Based on this photo, generate a dignified black and white memorial portrait, serious expression, classic style, keep the original person features.',
    };

    const prompt = prompts[type] || prompts.id;

    const apiUrl = process.env.AIHUBMIX_API_URL || 'https://aihubmix.com';
    const apiKey = process.env.AIHUBMIX_API_KEY;
    const model = process.env.AI_MODEL || 'gemini-3-pro-image-preview';

    console.log('Using API URL:', apiUrl);
    console.log('Using Model:', model);
    console.log('API Key exists:', !!apiKey);

    if (!apiKey || apiKey === 'demo' || apiKey.includes('your-')) {
      return NextResponse.json(
        { error: 'AI API key not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    // Use chat completions endpoint which we confirmed works for gemini-3-pro-image-preview
    const response = await fetch(apiUrl + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageDataUrl } }
            ]
          }
        ],
        max_tokens: 2000,
        response_modalities: ['image', 'text']
      })
    });

    const responseText = await response.text();
    console.log('API response status:', response.status);
    console.log('API response length:', responseText.length);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'AI API error: ' + response.status + ' - ' + responseText.substring(0, 300) },
        { status: 502 }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('JSON parse error:', e);
      return NextResponse.json({ error: 'Invalid JSON response from AI API: ' + responseText.substring(0, 200) }, { status: 502 });
    }

    // Extract image data from response
    const message = data.choices?.[0]?.message;
    if (!message) {
      console.error('No message in response:', JSON.stringify(data, null, 2));
      return NextResponse.json({ error: 'No response from AI model' }, { status: 502 });
    }

    let imageBase64: string | null = null;
    
    // Check for inline image data in content array (OpenAI-compatible format)
    if (Array.isArray(message.content)) {
      imageBase64 = extractBase64ImageFromResponse(message.content);
    } else if (typeof message.content === 'string') {
      imageBase64 = extractBase64ImageFromResponse(message.content);
    }

    if (!imageBase64) {
      console.error('No image found in response:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { 
          error: 'AI model did not return an image. Response content: ' + 
            (typeof message.content === 'string' 
              ? message.content.substring(0, 200) 
              : JSON.stringify(message.content)) 
        }, 
        { status: 502 }
      );
    }

    // If imageBase64 is already a data URL, extract just the base64 part
    if (imageBase64.startsWith('data:')) {
      imageBase64 = imageBase64.split(',')[1];
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `generated/${userId}_${timestamp}_${type}.png`;

    // Upload to R2
    const uploadedUrl = await uploadToR2(imageBuffer, filename, 'image/png');
    
    console.log('Image generated successfully:', uploadedUrl);

    return NextResponse.json({
      success: true,
      imageUrl: uploadedUrl,
      originalUrl: imageDataUrl,
      message: 'Image generated successfully'
    });

  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: '生成失败: ' + String(error) },
      { status: 500 }
    );
  }
}
