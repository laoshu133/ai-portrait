import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getUserQuota } from '@/lib/quota';

export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const quota = await getUserQuota(userId);
    return NextResponse.json({
      remainingQuota: quota.remainingQuota,
      totalPurchased: quota.totalPurchased,
      totalGenerated: quota.totalGenerated,
    });
  } catch (error) {
    console.error('Error getting quota:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
