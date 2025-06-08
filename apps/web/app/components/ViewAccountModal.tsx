import { AccountInterface } from "../types/accounts";
import { formatDate } from "../utils/date";
import { formatCurrency } from "../utils/currency";
import { useCurrency } from "../providers/CurrencyProvider";

interface ViewAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: AccountInterface | null;
}

function AccountRow({ label, value }: { label: string; value: string }) {
    return (
        <tr>
            <td className="py-2 pr-4 text-sm font-medium text-gray-600 align-top">{label}</td>
            <td className="py-2 text-sm text-gray-900">{value}</td>
        </tr>
    );
}

export function ViewAccountModal({ isOpen, onClose, account }: ViewAccountModalProps) {
    const { currency: userCurrency } = useCurrency();
    
    if (!isOpen || !account) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{account.bankName}</h2>
                            <p className="text-lg text-gray-600">{account.branchName}</p>
                        </div>
                        {account.balance !== undefined && (
                            <div className="text-right">
                                <p className="text-2xl font-bold text-green-600">{formatCurrency(account.balance, userCurrency)}</p>
                                <p className="text-sm text-gray-500">Current Balance</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6">
                    <table className="w-full table-auto">
                        <tbody>
                            <AccountRow label="Account Holder Name" value={account.holderName} />
                            <AccountRow label="Account Number" value={account.accountNumber} />
                            <AccountRow label="Account Type" value={account.accountType} />
                            <AccountRow label="IFSC/Branch Code" value={account.branchCode} />
                            <AccountRow label="Account Opening Date" value={formatDate(account.accountOpeningDate)} />
                            <AccountRow label="Mobile Numbers" value={account.mobileNumbers.join(", ")} />
                            <AccountRow label="SWIFT Code" value={account.swift} />
                            <AccountRow label="Bank Email" value={account.bankEmail} />
                            <AccountRow label="Bank Address" value={account.bankAddress} />
                            <AccountRow label="Branch Contacts" value={account.branchContacts.join(", ")} />
                            <AccountRow label="Security Questions" value={account.securityQuestion.join(", ")} />
                        </tbody>
                    </table>
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
} 