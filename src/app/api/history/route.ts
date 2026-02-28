import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserHistory } from '@/lib/history';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const history = await getUserHistory(userId);
    
    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error('Failed to get history:', error);
    return NextResponse.json(
      { error: 'Failed to get history: ' + String(error) },
      { status: 500 }
    );
  }
}
