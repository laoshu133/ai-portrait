import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadToR2 } from '@/lib/r2';

export const runtime = 'nodejs';
export const maxDuration = 120;

function extractBase64ImageFromMessage(message: any): string | null {
  console.log('Extracting image from message, content type:', typeof message.content);
  
  if (!message.content) {
    console.error('message.content is empty');
    return null;
  }

  // Case 1: content is array (multiple parts)
  if (Array.isArray(message.content)) {
    console.log('Content is array, length:', message.content.length);
    for (const part of message.content) {
      console.log('Part type:', typeof part, 'has data:', !!part.data, 'has inlineData:', !!part.inlineData);
      // Format: { data: "base64...", mime_type: "image/png" } (what we got from test)
      if (part.data && part.mime_type?.startsWith('image/')) {
        console.log('Found image in part.data, length:', part.data.length);
        return part.data;
      }
      // Gemini native format: part.inlineData.data
      if (part.inlineData?.data) {
        console.log('Found image in part.inlineData.data');
        return part.inlineData.data;
      }
      // OpenAI format: { type: 'image_url', image_url: { url: '...' } }
      if (part.type === 'image_url' && part.image_url?.url) {
        const url = part.image_url.url;
        console.log('Found image_url:', url.substring(0, 100) + '...');
        if (url.startsWith('data:image/')) {
          return url.split(',')[1];
        }
        return url;
      }
    }
  }

  // Case 2: content is string (maybe embedded base64)
  if (typeof message.content === 'string') {
    console.log('Content is string, length:', message.content.length);
    const base64Match = message.content.match(/data:image\/[a-zA-Z0-9]+;base64,([A-Za-z0-9+/=]+)/);
    if (base64Match) {
      console.log('Found base64 image in string');
      return base64Match[1];
    }
  }

  console.error('No image found in message');
  return null;
}

export async function POST(req: NextRequest) {
  console.log('=== Generate API started ===');
  
  try {
    const authResult = await auth();
    const userId = authResult.userId;
    
    console.log('User ID:', userId);
    
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

    console.log('Received: image=', image?.name, 'type=', type, 'lang=', lang);

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Input = buffer.toString('base64');
    const mimeType = image.type || 'image/jpeg';
    const imageDataUrl = 'data:' + mimeType + ';base64,' + base64Input;

    console.log('Input image converted to base64, length:', base64Input.length);

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
    console.log('Using prompt:', prompt);

    const apiUrl = process.env.AIHUBMIX_API_URL || 'https://aihubmix.com';
    const apiKey = process.env.AIHUBMIX_API_KEY;
    const model = process.env.AI_MODEL || 'gemini-3.1-flash-image-preview';

    console.log('API config:', { apiUrl, model, hasKey: !!apiKey });

    if (!apiKey || apiKey === 'demo' || apiKey.includes('your-')) {
      return NextResponse.json(
        { error: 'AI API key not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    const requestBody = {
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
      max_tokens: 2000
    };

    console.log('Sending request to AI API...');

    const response = await fetch(apiUrl + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(requestBody)
    });

    console.log('AI API responded with status:', response.status);

    const responseText = await response.text();
    console.log('Response text length:', responseText.length);

    if (!response.ok) {
      console.error('AI API returned error status:', response.status, 'Preview:', responseText.substring(0, 200));
      return NextResponse.json(
        { error: 'AI API error: ' + response.status + ' - ' + responseText.substring(0, 200) },
        { status: 502 }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('JSON parsed successfully');
      console.log('Has choices:', !!data.choices, 'choices length:', data.choices?.length);
    } catch (e) {
      console.error('JSON parse failed:', e, 'Preview:', responseText.substring(0, 200));
      return NextResponse.json({ error: 'Invalid JSON response from AI API' }, { status: 502 });
    }

    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('No choices in response:', JSON.stringify(data, null, 2).substring(0, 500));
      return NextResponse.json({ error: 'No choices returned from AI API' }, { status: 502 });
    }

    const choice = data.choices[0];
    if (!choice.message) {
      console.error('No message in first choice');
      return NextResponse.json({ error: 'No message in response' }, { status: 502 });
    }

    const imageBase64 = extractBase64ImageFromMessage(choice.message);
    if (!imageBase64) {
      return NextResponse.json({ error: 'AI model did not return an image' }, { status: 502 });
    }

    console.log('Extracted image base64, length:', imageBase64.length);

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    console.log('Converted to buffer, size:', imageBuffer.length);
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `generated/${userId}_${timestamp}_${type}.png`;
    console.log('Filename:', filename);

    // Upload to R2
    const uploadedUrl = await uploadToR2(imageBuffer, filename, 'image/png');
    console.log('Uploaded to R2:', uploadedUrl);
    
    console.log('=== Generate API completed successfully ===');

    return NextResponse.json({
      success: true,
      imageUrl: uploadedUrl,
      originalUrl: imageDataUrl,
      message: 'Image generated successfully'
    });

  } catch (error) {
    console.error('=== Generate API FATAL ERROR ===', error);
    console.error('Error stack:', (error as Error).stack);
    return NextResponse.json(
      { error: '生成失败: ' + String(error) },
      { status: 500 }
    );
  }
}
