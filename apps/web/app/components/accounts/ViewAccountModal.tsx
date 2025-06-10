import { AccountInterface } from "../../types/accounts";
import { formatDate } from "../../utils/date";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";

interface ViewAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: AccountInterface | null;
}

function InfoItem({ label, value, fullWidth = false }: { 
    label: string; 
    value: string; 
    fullWidth?: boolean;
}) {
    return (
        <div className={`${fullWidth ? 'col-span-2' : ''}`}>
            <dt className="text-sm font-medium text-gray-500 mb-1">{label}</dt>
            <dd className="text-sm text-gray-900">{value}</dd>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="border-b border-gray-200 pb-6 last:border-b-0">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {children}
            </dl>
        </div>
    );
}

export function ViewAccountModal({ isOpen, onClose, account }: ViewAccountModalProps) {
    const { currency: userCurrency } = useCurrency();
    
    if (!isOpen || !account) return null;

    // Calculate account age
    const accountAge = Math.floor((new Date().getTime() - new Date(account.accountOpeningDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    
    // Get account type badge style
    const getAccountTypeBadge = (type: string) => {
        return 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">{account.bankName}</h2>
                            <p className="text-sm text-gray-600">{account.branchName}</p>
                            <div className="flex items-center space-x-3 mt-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getAccountTypeBadge(account.accountType)}`}>
                                    {account.accountType}
                                </span>
                                <span className="text-xs text-gray-500">
                                    Opened {accountAge} year{accountAge !== 1 ? 's' : ''} ago
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            {account.balance !== undefined && (
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 mb-1">Current Balance</p>
                                    <p className="text-2xl font-semibold text-gray-900">
                                        {formatCurrency(account.balance, userCurrency)}
                                    </p>
                                </div>
                            )}
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-6 space-y-6">
                    {/* Account Details */}
                    <Section title="Account Details">
                        <InfoItem label="Account Holder" value={account.holderName} />
                        <InfoItem label="Account Number" value={account.accountNumber} />
                        <InfoItem label="Opening Date" value={formatDate(account.accountOpeningDate)} />
                        <InfoItem label="IFSC Code" value={account.branchCode} />
                    </Section>

                    {/* Bank Information */}
                    <Section title="Bank Information">
                        <InfoItem label="Bank Name" value={account.bankName} />
                        <InfoItem label="Branch Name" value={account.branchName} />
                        <InfoItem label="SWIFT Code" value={account.swift} />
                        <InfoItem label="Bank Email" value={account.bankEmail} />
                        <InfoItem label="Bank Address" value={account.bankAddress} fullWidth={true} />
                    </Section>

                    {/* Contact Information */}
                    <Section title="Contact Information">
                        <InfoItem 
                            label="Mobile Numbers" 
                            value={account.mobileNumbers.length > 0 ? account.mobileNumbers.join(", ") : "Not provided"} 
                            fullWidth={true}
                        />
                        <InfoItem 
                            label="Branch Contacts" 
                            value={account.branchContacts.length > 0 ? account.branchContacts.join(", ") : "Not provided"} 
                            fullWidth={true}
                        />
                    </Section>

                    {/* Security */}
                    {account.securityQuestion.length > 0 && (
                        <Section title="Security Questions">
                            <div className="col-span-2">
                                <div className="space-y-2">
                                    {account.securityQuestion.map((question, index) => (
                                        <div key={index} className="bg-gray-50 rounded-md px-3 py-2">
                                            <p className="text-sm text-gray-700">{question}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Section>
                    )}

                    {/* Mobile App Details */}
                    {(account.appUsername || account.appPassword || account.appPin) && (
                        <Section title="📱 Mobile App Details">
                            <InfoItem label="App Username" value={account.appUsername || "Not provided"} />
                            <InfoItem label="App Password" value={account.appPassword ? "•••••••••" : "Not provided"} />
                            <InfoItem label="App PIN" value={account.appPin ? "••••" : "Not provided"} />
                        </Section>
                    )}

                    {/* Additional Information */}
                    {(account.nickname || account.notes) && (
                        <Section title="📝 Additional Information">
                            {account.nickname && (
                                <InfoItem label="Nickname" value={account.nickname} />
                            )}
                            {account.notes && (
                                <InfoItem label="Notes" value={account.notes} fullWidth={true} />
                            )}
                        </Section>
                    )}

                    {/* Metadata */}
                    <Section title="Record Information">
                        <InfoItem label="Created" value={formatDate(account.createdAt)} />
                        <InfoItem label="Last Updated" value={formatDate(account.updatedAt)} />
                        <InfoItem label="Account ID" value={`#${account.id}`} />
                    </Section>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
} 