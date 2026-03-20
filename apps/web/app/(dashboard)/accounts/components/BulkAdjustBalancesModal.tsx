"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountInterface } from "../../../types/accounts";
import { formatCurrency } from "../../../utils/currency";
import {
    modalContentClasses,
    modalOverlayClasses,
    buttonClasses,
} from "../../../utils/formUtils";
import {
    accountsWithDraftBalances,
    getProportionalWithheldForAccount,
} from "../utils/accountWithheld";

interface BulkAdjustBalancesModalProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: AccountInterface[];
    withheldAmounts: Record<string, number>;
    currency: string;
    onApply: (updates: { id: number; balance: number }[]) => Promise<void>;
    isSaving: boolean;
}

export function BulkAdjustBalancesModal({
    isOpen,
    onClose,
    accounts,
    withheldAmounts,
    currency,
    onApply,
    isSaving,
}: BulkAdjustBalancesModalProps) {
    const [draftBalances, setDraftBalances] = useState<Record<number, number>>({});

    const accountsKey = useMemo(
        () =>
            accounts
                .map((a) => `${a.id}:${a.balance ?? 0}`)
                .sort()
                .join("|"),
        [accounts]
    );

    useEffect(() => {
        if (!isOpen || accounts.length === 0) return;
        const next: Record<number, number> = {};
        for (const a of accounts) {
            next[a.id] = a.balance ?? 0;
        }
        setDraftBalances(next);
    }, [isOpen, accountsKey, accounts]);

    const sortedAccounts = useMemo(() => {
        return [...accounts].sort((a, b) => {
            const bank = a.bankName.localeCompare(b.bankName);
            if (bank !== 0) return bank;
            return a.holderName.localeCompare(b.holderName);
        });
    }, [accounts]);

    const draftAccountList = useMemo(
        () => accountsWithDraftBalances(accounts, draftBalances),
        [accounts, draftBalances]
    );

    const handleBalanceChange = useCallback((id: number, raw: string) => {
        const parsed = parseFloat(raw);
        setDraftBalances((prev) => ({
            ...prev,
            [id]: Number.isFinite(parsed) ? parsed : 0,
        }));
    }, []);

    const handleResetRow = useCallback((account: AccountInterface) => {
        setDraftBalances((prev) => ({
            ...prev,
            [account.id]: account.balance ?? 0,
        }));
    }, []);

    const handleResetAll = useCallback(() => {
        const next: Record<number, number> = {};
        for (const a of accounts) {
            next[a.id] = a.balance ?? 0;
        }
        setDraftBalances(next);
    }, [accounts]);

    const handleApply = useCallback(async () => {
        const updates: { id: number; balance: number }[] = [];
        for (const a of accounts) {
            const next = draftBalances[a.id];
            if (next === undefined) continue;
            const prev = a.balance ?? 0;
            if (next !== prev) {
                updates.push({ id: a.id, balance: next });
            }
        }
        await onApply(updates);
    }, [accounts, draftBalances, onApply]);

    const hasChanges = useMemo(() => {
        return accounts.some((a) => {
            const next = draftBalances[a.id];
            if (next === undefined) return false;
            return next !== (a.balance ?? 0);
        });
    }, [accounts, draftBalances]);

    if (!isOpen) return null;

    return (
        <div className={modalOverlayClasses}>
            <div className={`${modalContentClasses} max-w-6xl`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Adjust all balances</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Set each account&apos;s new balance. Withheld amounts follow the same bank-wide split as
                            your accounts table. Free = new balance − withheld share.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none self-end sm:self-start"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[55vh] overflow-y-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <th className="px-3 py-3">Account</th>
                                <th className="px-3 py-3 text-right whitespace-nowrap">Withheld</th>
                                <th className="px-3 py-3 text-right whitespace-nowrap">Current</th>
                                <th className="px-3 py-3 w-8 text-center"></th>
                                <th className="px-3 py-3 text-right whitespace-nowrap min-w-[8rem]">New balance</th>
                                <th className="px-3 py-3 text-right whitespace-nowrap">Change</th>
                                <th className="px-3 py-3 text-right whitespace-nowrap">Free (new)</th>
                                <th className="px-3 py-3 w-24"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {sortedAccounts.map((account) => {
                                const current = account.balance ?? 0;
                                const next = draftBalances[account.id] ?? current;
                                const delta = next - current;

                                const withheldBefore = getProportionalWithheldForAccount(
                                    account,
                                    accounts,
                                    withheldAmounts
                                );
                                const withheldAfter = getProportionalWithheldForAccount(
                                    { ...account, balance: next },
                                    draftAccountList,
                                    withheldAmounts
                                );
                                const freeAfter = next - withheldAfter;

                                return (
                                    <tr key={account.id} className="hover:bg-gray-50/80">
                                        <td className="px-3 py-2">
                                            <div className="font-medium text-gray-900">{account.holderName}</div>
                                            <div className="text-xs text-gray-500">
                                                {account.bankName} · {account.accountType}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                                            <div>{formatCurrency(withheldBefore, currency)}</div>
                                            {withheldAfter !== withheldBefore && (
                                                <div className="text-xs text-blue-600">
                                                    → {formatCurrency(withheldAfter, currency)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-gray-800">
                                            {formatCurrency(current, currency)}
                                        </td>
                                        <td className="px-1 py-2 text-center text-gray-400">→</td>
                                        <td className="px-3 py-2 text-right">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={Number.isFinite(next) ? String(next) : "0"}
                                                onChange={(e) => handleBalanceChange(account.id, e.target.value)}
                                                className="w-full min-w-[7rem] px-2 py-1.5 border border-gray-300 rounded-md text-right tabular-nums focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                disabled={isSaving}
                                            />
                                        </td>
                                        <td
                                            className={`px-3 py-2 text-right tabular-nums font-medium ${
                                                delta > 0
                                                    ? "text-green-600"
                                                    : delta < 0
                                                      ? "text-red-600"
                                                      : "text-gray-500"
                                            }`}
                                        >
                                            {delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${formatCurrency(delta, currency)}`}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-gray-800">
                                            {formatCurrency(freeAfter, currency)}
                                        </td>
                                        <td className="px-3 py-2">
                                            <button
                                                type="button"
                                                onClick={() => handleResetRow(account)}
                                                className="text-xs text-blue-600 hover:text-blue-800"
                                                disabled={isSaving}
                                            >
                                                Reset row
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={handleResetAll}
                        className="text-sm text-gray-600 hover:text-gray-900 underline"
                        disabled={isSaving}
                    >
                        Reset all to current balances
                    </button>
                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className={buttonClasses.secondary}
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleApply()}
                            className={buttonClasses.primary}
                            disabled={isSaving || !hasChanges}
                        >
                            {isSaving ? "Saving…" : "Save all changes"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
