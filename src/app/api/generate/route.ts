import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, generateFileKey } from '@/lib/r2';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const type = formData.get('type') as string;
    const lang = formData.get('lang') as string;

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
    const originalKey = generateFileKey(image.name);
    const originalUrl = await uploadToR2(buffer, originalKey, image.type);

    // TODO: Call AI API to generate portrait
    // For now, we'll return the original image as a placeholder
    // In production, this would call aihubmix API with Gemini 3 Pro
    
    // Generate prompt based on type
    const prompts = {
      id: lang === 'zh' 
        ? '生成一张正式的证件照，蓝底，正装，面带微笑'
        : 'Generate a formal ID photo with blue background, business attire, smiling',
      festival: lang === 'zh'
        ? '生成一张节日祝福照，喜庆背景，节日氛围'
        : 'Generate a festive celebration photo with celebratory background',
      memorial: lang === 'zh'
        ? '生成一张遗像庄重黑白照片'
        : 'Generate a dignified black and white memorial portrait',
    };

    // TODO: Call AI image generation API here
    // This is where we'd use the aihubmix API with gemini-3-pro-image-preview
    
    // For MVP, return the uploaded image URL
    // In production, this would be the AI-generated image
    const generatedKey = originalKey.replace('uploads', 'generated');
    const generatedUrl = await uploadToR2(buffer, generatedKey, image.type);

    return NextResponse.json({
      success: true,
      imageUrl: generatedUrl,
      originalUrl: originalUrl,
      prompt: prompts[type as keyof typeof prompts] || prompts.id,
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Generation failed' },
      { status: 500 }
    );
  }
}
