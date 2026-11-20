import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@repo/db/client';
import { readCoordinates, serializeLocation } from '../location-data';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { getUserIdFromSession } from '../../../utils/auth';

type RouteContext = { params: Promise<{ id: string }> };

async function readLocationId(params: RouteContext['params']) {
    const { id } = await params;
    const locationId = Number(id);
    return /^\d+$/.test(id) && locationId > 0 && locationId <= 2147483647
        ? locationId
        : null;
}

// GET /api/transaction-locations/[id] - Get specific transaction location
export async function GET(
    _request: NextRequest,
    { params }: RouteContext
) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = getUserIdFromSession(session.user.id);
        const locationId = await readLocationId(params);

        if (locationId === null) {
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

        return NextResponse.json({ location: serializeLocation(location) });
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
    { params }: RouteContext
) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = getUserIdFromSession(session.user.id);
        const locationId = await readLocationId(params);

        if (locationId === null) {
            return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
        }

        const coordinates = await readCoordinates(request);
        if (!coordinates) {
            return NextResponse.json({ error: 'Invalid latitude or longitude' }, { status: 400 });
        }

        const location = await prisma.transactionLocation.update({
            where: { id: locationId, userId },
            data: coordinates
        });

        return NextResponse.json({ location: serializeLocation(location) });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }
        console.error('Error updating transaction location:', error);
        return NextResponse.json(
            { error: 'Failed to update transaction location' },
            { status: 500 }
        );
    }
}

// DELETE /api/transaction-locations/[id] - Delete transaction location
export async function DELETE(
    _request: NextRequest,
    { params }: RouteContext
) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = getUserIdFromSession(session.user.id);
        const locationId = await readLocationId(params);

        if (locationId === null) {
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
            where: { id: locationId, userId }
        });

        return NextResponse.json({ message: 'Location deleted successfully' });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            return NextResponse.json(
                { error: 'Cannot delete location that is being used by transactions' },
                { status: 400 }
            );
        }
        console.error('Error deleting transaction location:', error);
        return NextResponse.json(
            { error: 'Failed to delete transaction location' },
            { status: 500 }
        );
    }
}