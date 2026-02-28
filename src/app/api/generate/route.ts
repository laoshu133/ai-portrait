import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadToR2 } from '@/lib/r2';
import { addGenerationRecord, updateGenerationRecord } from '@/lib/history';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 180;

const MAX_IMAGE_SIZE_MB = 4;

const LOG_FILE = path.join(process.cwd(), 'generation-debug.log');

function log(message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (e) {
    console.error('Failed to write log:', e);
  }
  console.log(message);
}

function extractBase64ImageFromMessage(message: any): string | null {
  if (!message?.content) return null;

  if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part?.data && part?.mime_type?.startsWith('image/')) {
        log(`Found image in part.data, length: ${part.data.length}`);
        return part.data;
      }
      if (part?.inlineData?.data) {
        log(`Found image in part.inlineData.data`);
        return part.inlineData.data;
      }
      if (part?.type === 'image_url' && part?.image_url?.url) {
        const url = part.image_url.url;
        log(`Found image_url: ${url.substring(0, 100)}...`);
        return url.startsWith('data:image/') ? url.split(',')[1] : url;
      }
    }
  }

  if (typeof message.content === 'string') {
    const match = message.content.match(/data:image\/[a-zA-Z0-9]+;base64,([A-Za-z0-9+/=]+)/);
    if (match) {
      log(`Found base64 image in string content`);
      return match[1];
    }
  }

  log('No image found in message');
  return null;
}

export async function POST(req: NextRequest) {
  log('=== Starting generation request ===');
  
  try {
    const { userId } = await auth();
    log(`User ID: ${userId}`);
    
    if (!userId) {
      log('Unauthorized: no userId');
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const image = formData.get('image') as File;
    const type = (formData.get('type') as string) || 'id';
    const lang = (formData.get('lang') as string) || 'zh';

    log(`Received: image=${image?.name}, size=${image?.size}, type=${type}`);

    if (!image) {
      log('No image provided');
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (image.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      log(`Image too large: ${image.size} bytes > ${MAX_IMAGE_SIZE_MB * 1024 * 1024} bytes`);
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
    log(`Input converted: base64 length=${base64Input.length}`);

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

    log(`API config: apiUrl=${apiUrl}, model=${model}, hasKey=${!!apiKey}`);

    if (!apiKey || apiKey === 'demo' || apiKey.includes('your-')) {
      log('API key not configured');
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
    log(`Created history record: id=${record.id}`);

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

    log(`Request body created, messages=${requestBody.messages.length}, max_tokens=${requestBody.max_tokens}`);

    // Clear original image data reference
    (base64Input as any) = null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      log('Request timeout after 120 seconds');
      controller.abort();
    }, 120000); // 2 minutes

    try {
      log(`Sending request to ${apiUrl}/v1/chat/completions...`);
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

      log(`AI API responded with status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const text = await response.text();
        const preview = text.length > 200 ? text.substring(0, 200) : text;
        log(`AI API error: ${response.status} - ${preview}`);
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
      log(`Response received, length: ${responseText.length}`);
      
      let data;
      try {
        data = JSON.parse(responseText);
        log('JSON parsed successfully');
        log(`choices: ${data.choices?.length}, created: ${data.created}, model: ${data.model}`);
      } catch (e) {
        const preview = responseText.length > 200 ? responseText.substring(0, 200) : responseText;
        log(`JSON parse failed: ${e}, preview: ${preview}`);
        await updateGenerationRecord(userId, record.id, {
          status: 'failed',
          error: `JSON parse failed: ${preview}`
        });
        return NextResponse.json({ error: 'Invalid JSON response' }, { status: 502 });
      }

      if (!data.choices?.length) {
        log(`No choices in response: ${JSON.stringify(Object.keys(data))}`);
        await updateGenerationRecord(userId, record.id, {
          status: 'failed',
          error: 'No choices in response'
        });
        return NextResponse.json({ error: 'No response from AI' }, { status: 502 });
      }

      const choice = data.choices[0];
      if (!choice.message) {
        log(`No message in first choice: ${JSON.stringify(Object.keys(choice))}`);
        await updateGenerationRecord(userId, record.id, {
          status: 'failed',
          error: 'No message in response'
        });
        return NextResponse.json({ error: 'Invalid response format' }, { status: 502 });
      }

      log(`Got message: role=${choice.message.role}, content type=${typeof choice.message.content}`);

      const imageBase64 = extractBase64ImageFromMessage(choice.message);
      if (!imageBase64) {
        let preview = '';
        if (typeof choice.message.content === 'string') {
          preview = choice.message.content.substring(0, 100);
        } else if (Array.isArray(choice.message.content)) {
          preview = `Array(${choice.message.content.length})`;
        }
        log(`No image extracted: content preview=${preview}`);
        await updateGenerationRecord(userId, record.id, {
          status: 'failed',
          error: `No image returned: ${preview}`
        });
        return NextResponse.json({ error: 'AI did not return an image' }, { status: 502 });
      }

      log(`Image extracted: base64 length=${imageBase64.length}`);

      // Free up memory
      (data as any) = null;
      (responseText as any) = null;
      (requestBody as any) = null;

      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const timestamp = Date.now();
      const filename = `generated/${userId}_${timestamp}_${type}.png`;
      log(`Buffer created: size=${imageBuffer.length} bytes, filename=${filename}`);

      (imageBase64 as any) = null;

      const uploadedUrl = await uploadToR2(imageBuffer, filename, 'image/png');
      log(`Uploaded to R2: ${uploadedUrl}`);
      
      await updateGenerationRecord(userId, record.id, {
        status: 'success',
        generatedUrl: uploadedUrl
      });
      log('Updated history record status to success');

      log('=== Generation completed successfully ===');
      return NextResponse.json({ success: true, imageUrl: uploadedUrl });
    } catch (err) {
      clearTimeout(timeoutId);
      const errMsg = err instanceof Error ? err.message : String(err);
      const errStack = err instanceof Error ? err.stack : '';
      log(`Fetch failed: ${errMsg}\n${errStack}`);
      await updateGenerationRecord(userId, record.id, {
        status: 'failed',
        error: `Fetch failed: ${errMsg}`
      });
      throw err;
    }

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : '';
    log(`FATAL ERROR: ${errMsg}\n${errStack}`);
    return NextResponse.json(
      { error: `生成失败: ${errMsg}` },
      { status: 500 }
    );
  }
}
