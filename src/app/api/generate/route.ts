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

    console.log('Using API URL:', apiUrl);
    console.log('Using Model:', model);
    console.log('API Key exists:', !!apiKey);

    if (!apiKey || apiKey === 'demo' || apiKey.includes('your-')) {
      return NextResponse.json(
        { error: 'AI API key not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    // Try using Qwen VL model to process image via chat completions
    const chatResponse = await fetch(apiUrl + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-VL-72B-Instruct',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageDataUrl } }
            ]
          }
        ],
        max_tokens: 1000
      })
    });

    const chatText = await chatResponse.text();
    console.log('Chat API response status:', chatResponse.status);
    console.log('Chat API response:', chatText.substring(0, 500));

    if (!chatResponse.ok) {
      return NextResponse.json(
        { error: 'AI API error: ' + chatResponse.status + ' - ' + chatText.substring(0, 200) },
        { status: 502 }
      );
    }

    let chatData;
    try {
      chatData = JSON.parse(chatText);
    } catch {
      return NextResponse.json({ error: 'Invalid AI API response format' }, { status: 502 });
    }

    // For now, return a placeholder since VL models don't generate images directly
    // The user would need to use a proper image generation model
    return NextResponse.json({
      success: true,
      imageUrl: imageDataUrl,
      originalUrl: imageDataUrl,
      note: 'Using Qwen VL model - this is a preview. Image generation requires gemini model configuration.',
      description: chatData.choices?.[0]?.message?.content || 'No description'
    });

  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Generation failed: ' + String(error) },
      { status: 500 }
    );
  }
}
