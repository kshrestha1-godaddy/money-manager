import { Button } from "@repo/ui/button";

interface AppbarProps {
    user?: {
        name?: string | null;
    };
    onSignin: any;
    onSignout: any;
}

export const Appbar = ({ user, onSignin, onSignout }: AppbarProps) => {
    return (
        <div className="flex justify-between border-b px-4 border-slate-300 bg-gray-100">
            <div className="text-lg flex flex-col justify-center">PayTM</div>
            <div className="text-lg flex flex-col justify-center">{user?.name}</div>
            <div className="flex flex-col justify-center pt-2">
                <Button onClick={user ? onSignout : onSignin}>
                    {user ? "Logout" : "Login"}
                </Button>
            </div>
        </div>
    );
};
