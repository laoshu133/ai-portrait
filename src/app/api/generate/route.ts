import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { addGenerationRecord, updateGenerationRecord } from '@/lib/history';
import { hasEnoughQuota } from '@/lib/quota';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const hasQuota = await hasEnoughQuota(userId);
    if (!hasQuota) {
      return NextResponse.json(
        { error: 'INSUFFICIENT_QUOTA', message: '额度不足，请购买更多生成额度' },
        { status: 402 }
      );
    }

    const formData = await req.formData();
    const image = formData.get('image');
    const type = (formData.get('type') as string) || 'id';
    const lang = (formData.get('lang') as string) || 'zh';
    const purpose = (formData.get('purpose') as string) || 'common';
    const background = (formData.get('background') as string) || 'blue';

    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = image.type || 'image/jpeg';
    const originalUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

    const record = await addGenerationRecord(userId, {
      type: type as 'id' | 'festival' | 'memorial',
      originalUrl,
      generatedUrl: null,
      status: 'queued',
      lang,
      purpose: type === 'id' ? purpose : undefined,
      background: type === 'id' ? background : undefined,
    });

    await updateGenerationRecord(userId, record.id, {
      taskId: record.id,
      status: 'processing',
    });

    const origin = req.nextUrl.origin;
    fetch(`${origin}/api/generate/${record.id}?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: {
        'x-internal-task-secret': process.env.INTERNAL_TASK_SECRET || '',
      },
      cache: 'no-store',
    }).catch((error) => {
      console.error('Failed to start background generation:', error);
    });

    return NextResponse.json({
      success: true,
      recordId: record.id,
      taskId: record.id,
      status: 'queued',
    });
  } catch (error) {
    console.error('Failed to create generation task:', error);
    return NextResponse.json({ error: '创建生成任务失败' }, { status: 500 });
  }
}
