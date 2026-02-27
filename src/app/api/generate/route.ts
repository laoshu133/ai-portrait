import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

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
    const base64 = buffer.toString('base64');
    const mimeType = image.type || 'image/jpeg';
    const imageDataUrl = 'data:' + mimeType + ';base64,' + base64;

    const prompts: Record<string, string> = {
      id: lang === 'zh' 
        ? 'Generate a formal ID photo with blue background, business attire, smiling, professional look'
        : 'Generate a formal ID photo with blue background, business attire, smiling, professional look',
      festival: lang === 'zh'
        ? 'Generate a festive celebration photo with celebratory red background, warm smile, Chinese New Year style'
        : 'Generate a festive celebration photo with celebratory red background, warm smile',
      memorial: lang === 'zh'
        ? 'Generate a dignified black and white memorial portrait, serious expression, classic style'
        : 'Generate a dignified black and white memorial portrait, serious expression',
    };

    const prompt = prompts[type] || prompts.id;

    const apiUrl = process.env.AIHUBMIX_API_URL || 'https://aihubmix.com';
    const apiKey = process.env.AIHUBMIX_API_KEY;
    const model = process.env.AI_MODEL || 'gemini-3-pro-image-preview';

    if (!apiKey || apiKey === 'demo' || apiKey.includes('your-')) {
      return NextResponse.json(
        { error: 'AI API key not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    const response = await fetch(apiUrl + '/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        image_url: imageDataUrl,
        num_images: 1,
        size: '1024x1024'
      })
    });

    const responseText = await response.text();
    console.log('AI API response status:', response.status);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'AI API error: ' + response.status + ' - ' + responseText.substring(0, 200) },
        { status: 502 }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json({ error: 'Invalid AI API response format' }, { status: 502 });
    }
    
    if (data.data && data.data[0] && data.data[0].url) {
      return NextResponse.json({
        success: true,
        imageUrl: data.data[0].url,
        originalUrl: imageDataUrl,
        prompt: prompt
      });
    }

    return NextResponse.json(
      { error: 'AI did not generate an image. Please try again.' },
      { status: 502 }
    );

  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Generation failed: ' + String(error) },
      { status: 500 }
    );
  }
}
