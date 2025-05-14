"use client";

import { useBalance } from "@repo/store/balance";

export default function Balance() {
    const balance = useBalance();
    
    return (
        <div>
            <p>{balance}</p>
        </div>
    );
}
