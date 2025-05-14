"use client";

import { useSession } from "next-auth/react";
import Balance from "../../components/Balance";

export default function Dashboard() {

    const session = useSession();
    return (
        <div>
            <h1>Dashboard</h1>
            <Balance/>
            {JSON.stringify(session)}
        </div>
    );
}
