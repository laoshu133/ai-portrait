import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in', code: 'NO_USER_ID' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const image = formData.get('image') as File;
    const type = formData.get('type') as string || 'id';
    const lang = formData.get('lang') as string || 'zh';

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Convert image to base64 for demo (bypass R2 for now)
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = image.type || 'image/jpeg';
    
    // Create a data URL for the image (for demo purposes)
    const imageDataUrl = `data:${mimeType};base64,${base64}`;

    // Generate prompt based on type
    const prompts = {
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

    const prompt = prompts[type as keyof typeof prompts] || prompts.id;

    // Call aihubmix API for AI image generation
    const apiUrl = process.env.AIHUBMIX_API_URL || 'https://aihubmix.com';
    const apiKey = process.env.AIHUBMIX_API_KEY;
    const model = process.env.AI_MODEL || 'gemini-3-pro-image-preview';

    console.log('API Key exists:', !!apiKey);
    console.log('API URL:', apiUrl);
    console.log('Model:', model);

    if (!apiKey || apiKey === 'demo' || apiKey.includes('your-')) {
      // Fallback: return the uploaded image as demo
      return NextResponse.json({
        success: true,
        imageUrl: imageDataUrl,
        originalUrl: imageDataUrl,
        prompt: prompt,
        note: 'Demo mode - using uploaded image'
      });
    }

    // Call AI API
    const response = await fetch(`${apiUrl}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
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
    console.log('AI API response:', responseText.substring(0, 500));

    if (!response.ok) {
      // Return uploaded image as fallback
      return NextResponse.json({
        success: true,
        imageUrl: imageDataUrl,
        originalUrl: imageDataUrl,
        prompt: prompt,
        note: 'AI API failed, using original image'
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json({
        success: true,
        imageUrl: imageDataUrl,
        originalUrl: imageDataUrl,
        prompt: prompt,
        note: 'Invalid AI response'
      });
    }
    
    if (data.data && data.data[0] && data.data[0].url) {
      return NextResponse.json({
        success: true,
        imageUrl: data.data[0].url,
        originalUrl: imageDataUrl,
        prompt: prompt
      });
    }

    // Fallback if no generated image in response
    return NextResponse.json({
      success: true,
      imageUrl: imageDataUrl,
      originalUrl: imageDataUrl,
      prompt: prompt,
      note: 'No AI image in response'
    });

  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Generation failed', details: String(error) },
      { status: 500 }
    );
  }
}
