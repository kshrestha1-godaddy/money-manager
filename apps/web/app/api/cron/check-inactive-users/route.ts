import { NextRequest, NextResponse } from 'next/server';
import { processInactiveUsersPasswordSharing } from '../../../actions/password-sharing';

export async function GET(request: NextRequest) {
  try {
    // Verify this is called from a cron job (optional security check)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting inactive users check...');
    
    const result = await processInactiveUsersPasswordSharing();
    
    console.log('Inactive users check completed:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Inactive users check completed',
      result
    }, { status: 200 });

  } catch (error) {
    console.error('Error in inactive users cron job:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Also allow POST for testing
export async function POST(request: NextRequest) {
  return GET(request);
}
