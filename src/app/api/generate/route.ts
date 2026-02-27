import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadToR2 } from '@/lib/r2';

export const runtime = 'nodejs';
export const maxDuration = 180;

const MAX_IMAGE_SIZE_MB = 8;

function extractBase64ImageFromMessage(message: any): string | null {
  if (!message.content) {
    console.error('message.content is empty');
    return null;
  }

  if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part.data && part.mime_type?.startsWith('image/')) {
        console.log('Found image in part.data, length:', part.data.length);
        return part.data;
      }
      if (part.inlineData?.data) {
        console.log('Found image in part.inlineData.data');
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

  if (typeof message.content === 'string') {
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

    console.log('Received: image=', image?.name, 'size=', image?.size, 'type=', type);

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (image.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Image too large. Maximum size is ${MAX_IMAGE_SIZE_MB}MB.` }, 
        { status: 413 }
      );
    }

    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Input = buffer.toString('base64');
    const mimeType = image.type || 'image/jpeg';
    const imageDataUrl = 'data:' + mimeType + ';base64,' + base64Input;

    console.log('Input image converted, base64 length:', base64Input.length);

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
    const model = process.env.AI_MODEL || 'gemini-3.1-flash-image-preview';

    console.log('API config: model=', model, 'apiUrl=', apiUrl, 'hasKey=', !!apiKey);

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

    // Free up memory
    (buffer as any) = null;
    (base64Input as any) = null;
    (imageDataUrl as any) = null;

    console.log('Sending request to AI API...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 160000);

    try {
      const response = await fetch(apiUrl + '/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('AI API responded, status:', response.status);

      const responseText = await response.text();
      const respLength = responseText.length;
      console.log('Response received, length:', respLength);

      if (!response.ok) {
        const preview = respLength > 200 ? responseText.substring(0, 200) : responseText;
        console.error('AI API error:', response.status, preview);
        return NextResponse.json(
          { error: 'AI API error: ' + response.status + ' - ' + preview },
          { status: 502 }
        );
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        const preview = respLength > 200 ? responseText.substring(0, 200) : responseText;
        console.error('JSON parse failed:', e, preview);
        return NextResponse.json({ error: 'Invalid JSON response from AI API' }, { status: 502 });
      }

      console.log('JSON parsed, choices:', data.choices?.length);

      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        console.error('No choices in response');
        return NextResponse.json({ error: 'No choices returned from AI API' }, { status: 502 });
      }

      const choice = data.choices[0];
      if (!choice.message) {
        console.error('No message in first choice');
        return NextResponse.json({ error: 'No message in response' }, { status: 502 });
      }

      const imageBase64 = extractBase64ImageFromMessage(choice.message);
      if (!imageBase64) {
        let preview = '';
        if (typeof choice.message.content === 'string') {
          preview = choice.message.content.substring(0, 200);
        } else if (Array.isArray(choice.message.content)) {
          preview = `Array(${choice.message.content.length})`;
        }
        console.error('No image extracted, content preview:', preview);
        return NextResponse.json(
          { error: 'AI model did not return an image. Preview: ' + preview }, 
          { status: 502 }
        );
      }

      console.log('Image extracted, base64 length:', imageBase64.length);

      const imageBuffer = Buffer.from(imageBase64, 'base64');
      console.log('Buffer created, size:', imageBuffer.length);
      
      const timestamp = Date.now();
      const filename = `generated/${userId}_${timestamp}_${type}.png`;
      console.log('Filename:', filename);

      // Free up memory
      (data as any) = null;
      (responseText as any) = null;
      (imageBase64 as any) = null;

      const uploadedUrl = await uploadToR2(imageBuffer, filename, 'image/png');
      console.log('Uploaded to R2:', uploadedUrl);
      
      console.log('=== Generate API completed successfully ===');

      return NextResponse.json({
        success: true,
        imageUrl: uploadedUrl,
        message: 'Image generated successfully'
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error) {
    console.error('=== Generate API FATAL ERROR ===');
    console.error('Name:', (error as Error).name);
    console.error('Message:', (error as Error).message);
    console.error('Stack:', (error as Error).stack?.split('\n').slice(0, 10).join('\n'));
    return NextResponse.json(
      { error: '生成失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
