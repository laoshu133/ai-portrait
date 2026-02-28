import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadToR2 } from '@/lib/r2';
import { addGenerationRecord, updateGenerationRecord } from '@/lib/history';

export const runtime = 'nodejs';
export const maxDuration = 180;

const MAX_IMAGE_SIZE_MB = 4;

function extractBase64ImageFromMessage(message: any): string | null {
  if (!message?.content) return null;

  if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part?.data && part?.mime_type?.startsWith('image/')) {
        return part.data;
      }
      if (part?.inlineData?.data) {
        return part.inlineData.data;
      }
      if (part?.type === 'image_url' && part?.image_url?.url) {
        const url = part.image_url.url;
        return url.startsWith('data:image/') ? url.split(',')[1] : url;
      }
    }
  }

  if (typeof message.content === 'string') {
    const match = message.content.match(/data:image\/[a-zA-Z0-9]+;base64,([A-Za-z0-9+/=]+)/);
    return match ? match[1] : null;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
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

    if (image.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `图片太大，请上传不超过 ${MAX_IMAGE_SIZE_MB}MB 的图片` }, 
        { status: 413 }
      );
    }

    // Convert to base64
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Input = buffer.toString('base64');
    const mimeType = image.type || 'image/jpeg';
    const imageDataUrl = `data:${mimeType};base64,${base64Input}`;

    // Clear references immediately
    (buffer as any) = null;
    (arrayBuffer as any) = null;

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
        { error: 'AI API key not configured' },
        { status: 500 }
      );
    }

    // Create record immediately (even if generation fails)
    const record = await addGenerationRecord(userId, {
      type: type as any,
      originalUrl: imageDataUrl,
      generatedUrl: null,
      status: 'failed',
      lang: lang
    });

    const requestBody = {
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageDataUrl } }
        ]
      }],
      max_tokens: 512
    };

    // Clear original image data reference
    (base64Input as any) = null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes

    try {
      const response = await fetch(`${apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`AI API responded: ${response.status}`);

      if (!response.ok) {
        const text = await response.text();
        const preview = text.length > 150 ? text.substring(0, 150) : text;
        await updateGenerationRecord(userId, record.id, {
          status: 'failed',
          error: `${response.status}: ${preview}`
        });
        return NextResponse.json(
          { error: `AI error ${response.status}: ${preview}` },
          { status: 502 }
        );
      }

      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        const preview = responseText.length > 150 ? responseText.substring(0, 150) : responseText;
        await updateGenerationRecord(userId, record.id, {
          status: 'failed',
          error: `JSON parse failed: ${preview}`
        });
        return NextResponse.json({ error: 'Invalid JSON response' }, { status: 502 });
      }

      if (!data.choices?.length) {
        await updateGenerationRecord(userId, record.id, {
          status: 'failed',
          error: 'No choices in response'
        });
        return NextResponse.json({ error: 'No response from AI' }, { status: 502 });
      }

      const choice = data.choices[0];
      if (!choice.message) {
        await updateGenerationRecord(userId, record.id, {
          status: 'failed',
          error: 'No message in response'
        });
        return NextResponse.json({ error: 'Invalid response format' }, { status: 502 });
      }

      const imageBase64 = extractBase64ImageFromMessage(choice.message);
      if (!imageBase64) {
        let preview = '';
        if (typeof choice.message.content === 'string') {
          preview = choice.message.content.substring(0, 100);
        } else if (Array.isArray(choice.message.content)) {
          preview = `Array(${choice.message.content.length})`;
        }
        await updateGenerationRecord(userId, record.id, {
          status: 'failed',
          error: `No image returned: ${preview}`
        });
        return NextResponse.json({ error: 'AI did not return an image' }, { status: 502 });
      }

      // Free up memory
      (data as any) = null;
      (responseText as any) = null;
      (requestBody as any) = null;

      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const timestamp = Date.now();
      const filename = `generated/${userId}_${timestamp}_${type}.png`;

      (imageBase64 as any) = null;

      const uploadedUrl = await uploadToR2(imageBuffer, filename, 'image/png');
      
      await updateGenerationRecord(userId, record.id, {
        status: 'success',
        generatedUrl: uploadedUrl
      });

      return NextResponse.json({ success: true, imageUrl: uploadedUrl });
    } catch (err) {
      clearTimeout(timeoutId);
      const errMsg = err instanceof Error ? err.message : String(err);
      await updateGenerationRecord(userId, record.id, {
        status: 'failed',
        error: `Fetch failed: ${errMsg}`
      });
      throw err;
    }

  } catch (err) {
    console.error('Generation error:', err);
    return NextResponse.json(
      { error: `生成失败: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
