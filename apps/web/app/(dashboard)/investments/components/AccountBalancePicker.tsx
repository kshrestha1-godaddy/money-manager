"use client";

import { useEffect, useRef, useState } from "react";

export interface AccountBalanceOption {
  id: number;
  bankName: string;
  nickname?: string | null;
  balance?: number;
}

interface AccountBalancePickerProps {
  accounts: AccountBalanceOption[];
  withheldByAccount: Record<string, number>;
  value: string;
  onChange: (accountId: string) => void;
  formatAmount: (amount: number) => string;
  disabled?: boolean;
  allowNone?: boolean;
  noneLabel?: string;
  id?: string;
}

function accountLabel(account: AccountBalanceOption): string {
  const nick = account.nickname?.trim();
  return nick ? `[${nick}] ${account.bankName}` : account.bankName;
}

export function AccountBalancePicker({
  accounts,
  withheldByAccount,
  value,
  onChange,
  formatAmount,
  disabled = false,
  allowNone = true,
  noneLabel = "No account selected",
  id,
}: AccountBalancePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = accounts.find((a) => String(a.id) === value) ?? null;

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`min-w-0 truncate ${selected || (!value && allowNone) ? "text-gray-900" : "text-gray-500"}`}>
          {selected ? accountLabel(selected) : allowNone ? noneLabel : "Select account"}
        </span>
        <span className="ml-2 shrink-0 text-gray-400" aria-hidden>
          ▾
        </span>
      </button>

      {isOpen ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="max-h-64 overflow-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th scope="col" className="px-3 py-2 font-medium">
                    Bank
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Total
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Free
                  </th>
                </tr>
              </thead>
              <tbody>
                {allowNone ? (
                  <tr
                    className={`cursor-pointer border-b border-gray-100 hover:bg-blue-50 ${
                      !value ? "bg-blue-50" : ""
                    }`}
                    onClick={() => {
                      onChange("");
                      setIsOpen(false);
                    }}
                  >
                    <td className="px-3 py-2 text-gray-600" colSpan={3}>
                      {noneLabel}
                    </td>
                  </tr>
                ) : null}
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-gray-500">
                      No accounts available.
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => {
                    const isSelected = String(account.id) === value;
                    const total = account.balance || 0;
                    const free = total - (withheldByAccount[String(account.id)] ?? 0);
                    return (
                      <tr
                        key={account.id}
                        className={`cursor-pointer border-b border-gray-100 last:border-0 hover:bg-blue-50 ${
                          isSelected ? "bg-blue-50" : ""
                        }`}
                        onClick={() => {
                          onChange(String(account.id));
                          setIsOpen(false);
                        }}
                      >
                        <td className="max-w-[12rem] px-3 py-2 break-words font-medium text-gray-900">
                          {accountLabel(account)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-800">
                          {formatAmount(total)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium ${
                            free < 0 ? "text-red-700" : "text-teal-800"
                          }`}
                        >
                          {formatAmount(free)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
