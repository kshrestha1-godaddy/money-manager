"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { AccountInterface } from "../../../types/accounts";
import { updateAccount } from "../actions/accounts";

export function AccountChartVisibilityToggle({ account }: { account: AccountInterface }) {
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const visible = account.showInBalanceChart !== false;
    const mutation = useMutation({
        mutationFn: () => updateAccount(account.id, { showInBalanceChart: !visible }),
        onSuccess: (updated: AccountInterface) => {
            queryClient.setQueryData<AccountInterface[]>(['accounts'], previous =>
                previous?.map(row => row.id === updated.id ? updated : row)
            );
            setError(null);
        },
        onError: () => setError("Could not save. Try again."),
    });
    const Icon = mutation.isPending ? Loader2 : visible ? Eye : EyeOff;
    const label = `${visible ? "Hide" : "Show"} ${account.nickname || account.bankName} in balance chart`;

    return (
        <div className="flex flex-col items-center gap-1">
            <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                aria-label={label}
                aria-pressed={visible}
                title={label}
                className={`rounded-md p-1 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50 ${visible ? "text-blue-600" : "text-gray-400"}`}
            >
                <Icon className={`h-4 w-4 ${mutation.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
            </button>
            {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
        </div>
    );
}
