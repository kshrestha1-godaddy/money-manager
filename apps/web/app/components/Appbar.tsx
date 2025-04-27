"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@repo/ui/button";

import { useBalance } from "@repo/store/balance";

interface AppbarProps {
    user?: {
        name?: string | null;
    };
    onSignin: any;
    onSignout: any;
}

export const AppbarComponent = ({ user, onSignin, onSignout }: AppbarProps) => {
    const balance = useBalance();
    return (
        <div className="flex justify-between border-b px-4 border-slate-300">
            <div className="text-lg flex flex-col justify-center">PayTM</div>
            <div className="text-lg flex flex-col justify-center">{user?.name} - Rs. {balance}</div>

            <div className="flex flex-col justify-center pt-2">
                <Button onClick={user ? onSignout : onSignin}>
                    {user ? "Logout" : "Login"}
                </Button>
            </div>
        </div>
    );
};



export function Appbar() {
    const session = useSession();
    const router = useRouter();

    return (
        <div>
            <AppbarComponent
                onSignin={signIn}
                onSignout={async () => {
                    await signOut();
                    router.push("/api/auth/signin");
                }}
                user={session.data?.user}
            />
        </div>
    );
}
