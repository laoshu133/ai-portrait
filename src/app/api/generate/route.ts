import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadToR2, generateFileKey } from '@/lib/r2';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  // Require authentication
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized - Please sign in' },
      { status: 401 }
    );
  }

  try {
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

    // Convert image to buffer
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload original image to R2
    const originalKey = generateFileKey(image.name, userId);
    const originalUrl = await uploadToR2(buffer, originalKey, image.type);

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

    if (!apiKey || apiKey === 'demo' || apiKey.includes('your-')) {
      // Fallback: return original image for demo
      return NextResponse.json({
        success: true,
        imageUrl: originalUrl,
        originalUrl: originalUrl,
        prompt: prompt,
        note: 'Demo mode - returning original image'
      });
    }

    // Convert image to base64
    const base64Image = buffer.toString('base64');
    const mimeType = image.type || 'image/jpeg';

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
        image_url: `data:${mimeType};base64,${base64Image}`,
        num_images: 1,
        size: '1024x1024'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      // Fallback to original image
      return NextResponse.json({
        success: true,
        imageUrl: originalUrl,
        originalUrl: originalUrl,
        prompt: prompt,
        note: 'AI generation failed, returning original'
      });
    }

    const data = await response.json();
    
    if (data.data && data.data[0] && data.data[0].url) {
      // Download AI-generated image and upload to R2
      const generatedImageResponse = await fetch(data.data[0].url);
      const generatedImageBuffer = await generatedImageResponse.arrayBuffer();
      const generatedBuffer = Buffer.from(generatedImageBuffer);
      
      const generatedKey = originalKey.replace('uploads', 'generated');
      const generatedUrl = await uploadToR2(generatedBuffer, generatedKey, 'image/png');

      return NextResponse.json({
        success: true,
        imageUrl: generatedUrl,
        originalUrl: originalUrl,
        prompt: prompt
      });
    }

    // Fallback if no generated image in response
    return NextResponse.json({
      success: true,
      imageUrl: originalUrl,
      originalUrl: originalUrl,
      prompt: prompt,
      note: 'No AI image in response'
    });

  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Generation failed' },
      { status: 500 }
    );
  }
}
