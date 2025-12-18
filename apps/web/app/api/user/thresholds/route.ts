import { NextRequest, NextResponse } from 'next/server';
import { getUserThresholds } from '../../../actions/notifications';

export async function GET(request: NextRequest) {
    try {
        const thresholds = await getUserThresholds();
        
        return NextResponse.json(thresholds, { status: 200 });
    } catch (error) {
        console.error('Error fetching user thresholds:', error);
        
        // Return default values on error
        return NextResponse.json({
            autoBookmarkEnabled: true,
            incomeThreshold: 50000,
            expenseThreshold: 10000
        }, { status: 200 }); // Return 200 with defaults instead of error to not break UI
    }
}
