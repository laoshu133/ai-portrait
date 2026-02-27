import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadToR2 } from '@/lib/r2';

export const runtime = 'nodejs';
export const maxDuration = 180;

// 进一步降低最大输入图片大小
const MAX_IMAGE_SIZE_MB = 5;

function extractBase64ImageFromMessage(message: any): string | null {
  if (!message.content) {
    return null;
  }

  if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part.data && part.mime_type?.startsWith('image/')) {
        return part.data;
      }
      if (part.inlineData?.data) {
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
      return base64Match[1];
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await auth();
    const userId = authResult.userId;
    
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

    // 严格限制图片大小
    if (image.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `图片太大，请上传不超过 ${MAX_IMAGE_SIZE_MB}MB 的图片` }, 
        { status: 413 }
      );
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
    const model = process.env.AI_MODEL || 'gemini-3.1-flash-image-preview';

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
      // 降低 max_tokens 减少内存占用
      max_tokens: 1000
    };

    // 立即释放不再需要的内存
    (buffer as any) = null;
    (base64Input as any) = null;

    const controller = new AbortController();
    // 缩短超时，避免长时间挂起
    const timeoutId = setTimeout(() => controller.abort(), 140000);

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

      if (!response.ok) {
        const responseText = await response.text();
        const preview = responseText.length > 200 ? responseText.substring(0, 200) : responseText;
        console.error('AI API error:', response.status, preview);
        return NextResponse.json(
          { error: 'AI API error: ' + response.status + ' - ' + preview },
          { status: 502 }
        );
      }

      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        const preview = responseText.length > 200 ? responseText.substring(0, 200) : responseText;
        console.error('JSON parse failed:', preview);
        return NextResponse.json({ error: 'Invalid JSON response from AI API' }, { status: 502 });
      }

      // 释放响应文本内存
      (responseText as any) = null;

      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        console.error('No choices in response');
        return NextResponse.json({ error: 'No choices returned from AI API' }, { status: 502 });
      }

      const choice = data.choices[0];
      if (!choice.message) {
        console.error('No message in response');
        return NextResponse.json({ error: 'No message in response' }, { status: 502 });
      }

      const imageBase64 = extractBase64ImageFromMessage(choice.message);
      if (!imageBase64) {
        let preview = '';
        if (typeof choice.message.content === 'string') {
          preview = choice.message.content.substring(0, 100);
        } else if (Array.isArray(choice.message.content)) {
          preview = `Array(${choice.message.content.length})`;
        }
        console.error('No image extracted:', preview);
        return NextResponse.json(
          { error: 'AI 没有返回图片，请重试' }, 
          { status: 502 }
        );
      }

      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const timestamp = Date.now();
      const filename = `generated/${userId}_${timestamp}_${type}.png`;

      // 释放数据
      (data as any) = null;
      (imageBase64 as any) = null;

      const uploadedUrl = await uploadToR2(imageBuffer, filename, 'image/png');

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
    console.error('FATAL ERROR:', (error as Error).message);
    return NextResponse.json(
      { error: '生成失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
