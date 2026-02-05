import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { getUserIdFromSession } from '../../utils/auth';

const prisma = new PrismaClient();

// GET /api/transaction-locations - Get user's transaction locations
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = getUserIdFromSession(session.user.id);
        
        const locations = await prisma.transactionLocation.findMany({
            where: {
                userId
            },
            orderBy: [
                { createdAt: 'desc' }
            ]
        });

        return NextResponse.json({ locations });
    } catch (error) {
        console.error('Error fetching transaction locations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transaction locations' },
            { status: 500 }
        );
    }
}

// POST /api/transaction-locations - Create new transaction location
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = getUserIdFromSession(session.user.id);
        const body = await request.json();
        
        const { latitude, longitude } = body;

        // Validate required fields
        if (latitude === undefined || longitude === undefined) {
            return NextResponse.json(
                { error: 'Latitude and longitude are required' },
                { status: 400 }
            );
        }

        const location = await prisma.transactionLocation.create({
            data: {
                latitude: Number(latitude),
                longitude: Number(longitude),
                userId
            }
        });

        return NextResponse.json({ location }, { status: 201 });
    } catch (error) {
        console.error('Error creating transaction location:', error);
        return NextResponse.json(
            { error: 'Failed to create transaction location' },
            { status: 500 }
        );
    }
}