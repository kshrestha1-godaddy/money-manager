import { getServerSession } from "next-auth";

import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession();

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        return NextResponse.json({ user: session.user });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 },
        );
    }
}
