"use client";

import { useCallback, useMemo, useState } from "react";
import { AccountInterface } from "../../../types/accounts";
import { formatCurrency } from "../../../utils/currency";
import {
    modalContentClasses,
    modalOverlayClasses,
    buttonClasses,
} from "../../../utils/formUtils";
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
    const [draftBalances, setDraftBalances] = useState<Record<number, string>>({});
    const [saveError, setSaveError] = useState<string | null>(null);

    const sortedAccounts = useMemo(() => {
        return [...accounts].sort((a, b) => {
            const bank = a.bankName.localeCompare(b.bankName);
            if (bank !== 0) return bank;
            return a.holderName.localeCompare(b.holderName);
        });
    }, [accounts]);

    const handleResetRow = useCallback((account: AccountInterface) => {
        setDraftBalances((previous) => {
            const next = { ...previous };
            delete next[account.id];
            return next;
        });
    }, []);

    const updates = accounts.flatMap((account) => {
        const raw = draftBalances[account.id];
        const balance = raw?.trim() ? Number(raw) : NaN;
        return Number.isFinite(balance) && balance !== (account.balance ?? 0)
            ? [{ id: account.id, balance }]
            : [];
    });
    const hasInvalidBalance = accounts.some(({ id }) => {
        const draft = draftBalances[id];
        return draft !== undefined && (!draft.trim() || !Number.isFinite(Number(draft)));
    });

    async function handleApply() {
        if (isSaving || hasInvalidBalance || !updates.length) return;
        setSaveError(null);
        try {
            await onApply(updates);
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : "Couldn’t save the balances. Please try again.");
        }
    }

    if (!isOpen) return null;

    return (
        <div className={modalOverlayClasses}>
            <div className={`${modalContentClasses} max-w-6xl`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Adjust all balances</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Set each account&apos;s new balance. Withheld amounts follow the same bank-wide split as
                            your accounts table. Free balance is the new balance minus investments withheld from that account.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
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
                                const draft = draftBalances[account.id] ?? String(current);
                                const next = draft.trim() ? Number(draft) : NaN;
                                const valid = Number.isFinite(next);
                                const delta = next - current;

                                const withheld = withheldAmounts[account.id] ?? 0;
                                const freeAfter = next - withheld;

                                return (
                                    <tr key={account.id} className="hover:bg-gray-50/80">
                                        <td className="px-3 py-2">
                                            <div className="font-medium text-gray-900">{account.holderName}</div>
                                            <div className="text-xs text-gray-500">
                                                {account.bankName} · {account.accountType}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                                            {formatCurrency(withheld, currency)}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-gray-800">
                                            {formatCurrency(current, currency)}
                                        </td>
                                        <td className="px-1 py-2 text-center text-gray-400">→</td>
                                        <td className="px-3 py-2 text-right">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={draft}
                                                aria-label={`New balance for ${account.bankName} · ${account.holderName}`}
                                                aria-invalid={!valid}
                                                onChange={(event) => {
                                                    const value = event.target.value;
                                                    setDraftBalances((previous) => ({ ...previous, [account.id]: value }));
                                                }}
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
                                            {!valid || delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${formatCurrency(delta, currency)}`}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-gray-800">
                                            {valid ? formatCurrency(freeAfter, currency) : "—"}
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

                {(saveError || hasInvalidBalance) && (
                    <p role="alert" className="px-4 pt-3 text-sm text-red-700">
                        {saveError || "Enter a valid balance in each edited row."}
                    </p>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={() => setDraftBalances({})}
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
                            disabled={isSaving || hasInvalidBalance || !updates.length}
                        >
                            {isSaving ? "Saving…" : "Save all changes"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
