import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getCreemClient } from '@/lib/creem';
import { getProductById } from '@/lib/creem';
import { getUserQuota } from '@/lib/quota';

export async function POST(request: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const { productId } = await request.json();
    
    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }
    
    const product = getProductById(productId);
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // 首单专属限购校验
    if (product.firstOrderOnly) {
      const quota = await getUserQuota(userId);
      if (quota.usedFirstOrderPack) {
        return NextResponse.json({ 
          error: '首单体验包每人限购1次，您已使用过该优惠' 
        }, { status: 400 });
      }
    }
    
    const client = getCreemClient();
    
    if (!client) {
      return NextResponse.json({ 
        error: '支付功能暂时不可用，请稍后再试或联系管理员' 
      }, { status: 503 });
    }
    
    // Get base URL from environment or request
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (request.headers.get('origin') || 'https://ai-portrait.aipixbox.com');
    
    // Create checkout session
    const result = await client.createCheckout({
      product_id: productId,
      success_url: `${baseUrl}/quota?success=true`,
      cancel_url: `${baseUrl}/quota?canceled=true`,
    });
    
    // Add userId to metadata for webhook
    const checkoutUrl = `${result.session.checkout_url}?metadata=${encodeURIComponent(JSON.stringify({ userId }))}`;
    
    return NextResponse.json({
      checkoutUrl,
      product: {
        id: product.id,
        name: product.name,
        quota: product.quota,
      },
    });
  } catch (error) {
    console.error('Create checkout error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

