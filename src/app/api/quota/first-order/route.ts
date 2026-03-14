import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getUserQuota } from '@/lib/quota';

// Check if user is eligible for first-order pack
export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ eligible: false }, { status: 401 });
  }
  
  const quota = await getUserQuota(userId);
  return NextResponse.json({
    eligible: !quota.usedFirstOrderPack,
  });
}
