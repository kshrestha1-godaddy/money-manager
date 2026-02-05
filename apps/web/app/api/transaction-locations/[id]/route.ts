import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { getUserIdFromSession } from '../../../utils/auth';

const prisma = new PrismaClient();

// GET /api/transaction-locations/[id] - Get specific transaction location
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = getUserIdFromSession(session.user.id);
        const locationId = parseInt(params.id);

        if (isNaN(locationId)) {
            return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
        }

        const location = await prisma.transactionLocation.findFirst({
            where: {
                id: locationId,
                userId
            }
        });

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        return NextResponse.json({ location });
    } catch (error) {
        console.error('Error fetching transaction location:', error);
        return NextResponse.json(
            { error: 'Failed to fetch transaction location' },
            { status: 500 }
        );
    }
}

// PUT /api/transaction-locations/[id] - Update transaction location
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = getUserIdFromSession(session.user.id);
        const locationId = parseInt(params.id);

        if (isNaN(locationId)) {
            return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
        }

        const body = await request.json();
        const { latitude, longitude } = body;

        // Validate required fields
        if (latitude === undefined || longitude === undefined) {
            return NextResponse.json(
                { error: 'Latitude and longitude are required' },
                { status: 400 }
            );
        }

        // Check if location exists and belongs to user
        const existingLocation = await prisma.transactionLocation.findFirst({
            where: {
                id: locationId,
                userId
            }
        });

        if (!existingLocation) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        const location = await prisma.transactionLocation.update({
            where: { id: locationId },
            data: {
                latitude: Number(latitude),
                longitude: Number(longitude)
            }
        });

        return NextResponse.json({ location });
    } catch (error) {
        console.error('Error updating transaction location:', error);
        return NextResponse.json(
            { error: 'Failed to update transaction location' },
            { status: 500 }
        );
    }
}

// DELETE /api/transaction-locations/[id] - Soft delete transaction location
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = getUserIdFromSession(session.user.id);
        const locationId = parseInt(params.id);

        if (isNaN(locationId)) {
            return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
        }

        // Check if location exists and belongs to user
        const existingLocation = await prisma.transactionLocation.findFirst({
            where: {
                id: locationId,
                userId
            }
        });

        if (!existingLocation) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }

        // Check if location is being used by any transactions
        const [expenseCount, incomeCount] = await Promise.all([
            prisma.expense.count({
                where: { transactionLocationId: locationId }
            }),
            prisma.income.count({
                where: { transactionLocationId: locationId }
            })
        ]);

        if (expenseCount > 0 || incomeCount > 0) {
            return NextResponse.json(
                { 
                    error: 'Cannot delete location that is being used by transactions',
                    details: {
                        expenseCount,
                        incomeCount,
                        totalTransactions: expenseCount + incomeCount
                    }
                },
                { status: 400 }
            );
        }

        // Delete the location
        await prisma.transactionLocation.delete({
            where: { id: locationId }
        });

        return NextResponse.json({ message: 'Location deleted successfully' });
    } catch (error) {
        console.error('Error deleting transaction location:', error);
        return NextResponse.json(
            { error: 'Failed to delete transaction location' },
            { status: 500 }
        );
    }
}