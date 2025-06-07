"use client";

import { Card } from "@repo/ui/card";
import React, { useState } from "react";
import { AccountInterface } from "../types/accounts";

export function AccountCard({ account }: { account: AccountInterface }) {
    return (
        <Card title={`${account.bankName}, ${account.branchName}`}>
            <div className="mt-2">
                <table className="w-full table-auto text-sm">
                    <tbody>
                        <AccountRow label="A/C Holder Name" value={account.holderName} />
                        <AccountRow label="Account Number" value={account.accountNumber} />
                        <AccountRow label="IFSC/Code" value={account.branchCode} />
                        <AccountRow label="Account Opening Date" value={account.accountOpeningDate.toLocaleDateString()} />
                        <AccountRow label="Account Type" value={account.accountType} />
                        <AccountRow label="Mobile No" value={account.mobileNumbers.join(", ")} />
                        <AccountRow label="SWIFT" value={account.swift} />
                        <AccountRow label="Email" value={account.bankEmail} />
                        <AccountRow label="Bank Address" value={account.bankAddress} />
                        <AccountRow label="Branch Contact" value={account.branchContacts.join(", ")} />
                        <AccountRow label="Security Questions" value={account.securityQuestion.join(", ")} />
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

function AccountRow({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <tr>
            <td className="font-semibold pr-4 py-2 align-top w-1/3 break-words whitespace-pre-wrap">
                {label}
            </td>
            <td
                onClick={handleCopy}
                className="py-2 break-words whitespace-pre-wrap cursor-pointer text-gray-800 hover:text-blue-600 transition-colors relative"
                title="Click to copy"
            >
                {value}
                {copied && (
                    <span className="absolute text-xs text-green-600 ml-2">Copied</span>
                )}
            </td>
        </tr>
    );
}


export function AccountGrid({ accounts }: { accounts: AccountInterface[] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.map((acc, idx) => (
                <AccountCard key={idx} account={acc} />
            ))}
        </div>
    );
}