import { NextResponse } from 'next/server';
import { addQuota } from '@/lib/quota';
import { getProductById } from '@/lib/creem';

// Creem webhook handler
// After successful payment, Creem will send a webhook to this endpoint
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const signature = request.headers.get('creem-signature');
    
    // TODO: Verify webhook signature with Creem webhook secret
    // For now, we trust the payload since it's redirected from Creem checkout
    // In production, you should enable signature verification
    
    console.log('Received Creem webhook:', JSON.stringify(body, null, 2));
    
    // Handle checkout completed event
    if (body.event === 'checkout.completed') {
      const checkout = body.data.checkout;
      const productId = checkout.product_id;
      const customerEmail = checkout.customer_email;
      
      // Get userId from checkout metadata (we pass it when creating checkout)
      const userId = checkout.metadata?.userId;
      
      if (!userId) {
        console.error('No userId in checkout metadata');
        return NextResponse.json({ error: 'No userId provided' }, { status: 400 });
      }
      
      // Lookup product to get quota amount
      const product = getProductById(productId);
      
      if (!product) {
        console.error(`Product ${productId} not found`);
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      
      // Add quota to user
      const newRemaining = await addQuota(userId, product.quota);
      
      console.log(`Added ${product.quota} quota to user ${userId}, remaining: ${newRemaining}`);
      
      return NextResponse.json({
        success: true,
        message: `Added ${product.quota} quota to user`,
        remaining: newRemaining,
      });
    }
    
    // Other events we don't handle
    return NextResponse.json({ success: true, message: 'Event ignored' });
  } catch (error) {
    console.error('Creem webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
