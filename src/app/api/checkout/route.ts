import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getCreemClient } from '@/lib/creem';
import { getProductById } from '@/lib/creem';

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
    
    const client = getCreemClient();
    
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
    // Note: Creem client will include this in the checkout
    // We need to modify the request to include metadata
    // For now, we pass it as metadata query param
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
