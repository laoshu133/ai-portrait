import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';
import { getGenerationRecord, updateGenerationRecord } from '@/lib/history';
import { deductQuota } from '@/lib/quota';
import { getIdPhotoSpec, getImageExtensionFromMimeType } from '@/lib/id-photo';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 180;

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

function extractBase64ImageFromMessage(message: any): { base64: string; mimeType: string } | null {
  if (Array.isArray(message.multi_mod_content)) {
    for (const part of message.multi_mod_content) {
      if (part?.inline_data?.data) {
        return {
          base64: part.inline_data.data,
          mimeType: part.inline_data.mime_type || 'image/png',
        };
      }
      if (part?.data && part?.mime_type?.startsWith('image/')) {
        return {
          base64: part.data,
          mimeType: part.mime_type,
        };
      }
    }
  }

  if (!message?.content) {
    return null;
  }

  if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part?.data && part?.mime_type?.startsWith('image/')) {
        return {
          base64: part.data,
          mimeType: part.mime_type,
        };
      }
      if (part?.inlineData?.data) {
        return {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
        };
      }
      if (part?.type === 'image_url' && part?.image_url?.url?.startsWith('data:image/')) {
        const [meta, data] = part.image_url.url.split(',');
        const mimeType = meta.match(/data:(image\/[a-zA-Z0-9+.-]+);base64/)?.[1] || 'image/png';
        return {
          base64: data,
          mimeType,
        };
      }
    }
  }

  if (typeof message.content === 'string') {
    const match = message.content.match(/data:(image\/[a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=]+)/);
    if (match) {
      return { base64: match[2], mimeType: match[1] };
    }
  }

  return null;
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const recordId = params.id;

  try {
    const internalSecret = process.env.INTERNAL_TASK_SECRET || '';
    const requestSecret = req.headers.get('x-internal-task-secret') || '';
    if (internalSecret && internalSecret !== requestSecret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const record = await getGenerationRecord(userId, recordId);
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    await updateGenerationRecord(userId, recordId, { status: 'processing', error: undefined });

    const apiUrl = process.env.AIHUBMIX_API_URL || 'https://aihubmix.com';
    const apiKey = process.env.AIHUBMIX_API_KEY;
    const model = process.env.AI_MODEL || 'gemini-3.1-flash-image-preview';

    if (!apiKey || apiKey === 'demo' || apiKey.includes('your-')) {
      await updateGenerationRecord(userId, recordId, {
        status: 'failed',
        error: 'AI API key not configured',
      });
      return NextResponse.json({ error: 'AI API key not configured' }, { status: 500 });
    }

    const spec = getIdPhotoSpec(record.purpose);
    const sizeInstruction = record.type === 'id'
      ? `输出尺寸必须严格接近 ${spec.width}x${spec.height} 像素（纵向），宽高比必须严格为 ${spec.aspectRatio}，可理解为 ${spec.sizeId} 证件照规格。`
      : '输出为高清单人肖像，纵向构图。';

    const prompt = record.type === 'id'
      ? (record.lang === 'zh'
          ? `基于这张照片，生成一张正式证件照，${record.background}背景，穿着正装，面带自然微笑，保持人物五官特征完全不变。${sizeInstruction} 头部比例和证件照构图需规范，适合${spec.labelZh}。`
          : `Based on this photo, generate a formal ID photo with ${record.background} background, business attire, and natural smile while keeping the facial features unchanged. ${sizeInstruction} Use a standard ID photo composition suitable for ${spec.labelEn}.`)
      : record.type === 'festival'
      ? (record.lang === 'zh'
          ? '基于这张照片，生成一张喜庆节日照片，红色喜庆背景，温暖的笑容，保持人物特征不变。'
          : 'Based on this photo, generate a festive celebration photo with celebratory red background, warm smile, and unchanged facial features.')
      : (record.lang === 'zh'
          ? '基于这张照片，生成一张庄重的黑白纪念肖像，严肃的表情，经典风格，保持人物特征不变。'
          : 'Based on this photo, generate a dignified black and white memorial portrait with serious expression and unchanged facial features.');

    const requestBody = {
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'text', text: record.type === 'id' ? `aspectRatio: ${spec.aspectRatio}; sizeId: ${spec.sizeId}; targetSizePx: ${spec.width}x${spec.height}` : 'portraitMode: vertical' },
          { type: 'image_url', image_url: { url: record.originalUrl } }
        ]
      }],
      max_tokens: 512
    };

    log(`Generating record ${recordId} for user ${userId}`);
    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const text = await response.text();
      await updateGenerationRecord(userId, recordId, {
        status: 'failed',
        error: `AI error ${response.status}: ${text.slice(0, 200)}`,
      });
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const extracted = extractBase64ImageFromMessage(choice?.message);

    if (!extracted) {
      await updateGenerationRecord(userId, recordId, {
        status: 'failed',
        error: 'AI did not return an image',
      });
      return NextResponse.json({ error: 'AI did not return an image' }, { status: 502 });
    }

    const imageBuffer = Buffer.from(extracted.base64, 'base64');
    const ext = getImageExtensionFromMimeType(extracted.mimeType);
    const filename = `generated/${userId}_${Date.now()}_${record.type}.${ext}`;
    const uploadedUrl = await uploadToR2(imageBuffer, filename, extracted.mimeType);

    await updateGenerationRecord(userId, recordId, {
      status: 'success',
      generatedUrl: uploadedUrl,
      outputMimeType: extracted.mimeType,
      outputExtension: ext,
      outputWidth: record.type === 'id' ? spec.width : undefined,
      outputHeight: record.type === 'id' ? spec.height : undefined,
    });

    const deductResult = await deductQuota(userId);
    log(`Generation finished for ${recordId}, remaining quota=${deductResult.remaining}`);

    return NextResponse.json({
      success: true,
      imageUrl: uploadedUrl,
      recordId,
      remainingQuota: deductResult.remaining,
    });
  } catch (err) {
    const userId = req.nextUrl.searchParams.get('userId');
    if (userId) {
      await updateGenerationRecord(userId, recordId, {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      }).catch(() => undefined);
    }
    log(`Generation fatal error for ${recordId}: ${err instanceof Error ? err.stack || err.message : String(err)}`);
    return NextResponse.json({ error: '生成失败' }, { status: 500 });
  }
}
