"use client";

import { useState, useEffect } from "react";
import { Save, Bell, Earth, DollarSign, Calendar, TrendingUp, Shield, Settings, Bookmark } from "lucide-react";
import {
    getNotificationSettings,
    updateNotificationSettings,
    getUserAccountsForThresholds,
    NotificationSettingsData,
    AccountThresholdData
} from "../../actions/notifications";
import { useCurrency } from "../../providers/CurrencyProvider";

interface SettingsGroup {
    title: string;
    description: string;
    icon: React.ReactNode;
    settings: {
        key: keyof Omit<NotificationSettingsData, 'accountThresholds'>;
        label: string;
        description: string;
        type: 'boolean' | 'number';
        min?: number;
        max?: number;
        step?: number;
        dependsOn?: keyof NotificationSettingsData;
    }[];
}

export function NotificationSettings() {
    const [settings, setSettings] = useState<NotificationSettingsData | null>(null);
    const [availableAccounts, setAvailableAccounts] = useState<AccountThresholdData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const { currency } = useCurrency();

    // Load settings on mount
    useEffect(() => {
        loadSettings();
        loadAvailableAccounts();
    }, []);

    const loadSettings = async () => {
        try {
            setIsLoading(true);
            const data = await getNotificationSettings();
            setSettings(data || getDefaultSettings());
        } catch (error) {
            console.error("Failed to load notification settings:", error);
            setSettings(getDefaultSettings());
        } finally {
            setIsLoading(false);
        }
    };

    const loadAvailableAccounts = async () => {
        try {
            const accounts = await getUserAccountsForThresholds();
            setAvailableAccounts(accounts);
        } catch (error) {
            console.error("Failed to load accounts:", error);
            setAvailableAccounts([]);
        }
    };

    const getDefaultSettings = (): NotificationSettingsData => ({
        lowBalanceEnabled: true,
        lowBalanceThreshold: 500,
        accountThresholds: [],
        dueDateEnabled: true,
        dueDateDaysBefore: 7,
        spendingAlertsEnabled: true,
        monthlySpendingLimit: 5000,
        investmentAlertsEnabled: true,
        autoBookmarkEnabled: true,
        highValueIncomeThreshold: 50000,
        highValueExpenseThreshold: 10000,
        emailNotifications: false,
        pushNotifications: true
    });

    const handleSettingChange = (key: keyof NotificationSettingsData, value: boolean | number) => {
        if (!settings) return;
        
        setSettings(prev => prev ? { ...prev, [key]: value } : null);
    };

    const handleAccountThresholdChange = (accountId: number, threshold: number) => {
        if (!settings) return;

        setSettings(prev => {
            if (!prev) return null;
            
            const existingThresholds = prev.accountThresholds || [];
            const updatedThresholds = existingThresholds.some(t => t.accountId === accountId)
                ? existingThresholds.map(t => 
                    t.accountId === accountId 
                        ? { ...t, lowBalanceThreshold: threshold }
                        : t
                  )
                : [...existingThresholds, {
                    accountId,
                    accountName: availableAccounts.find(a => a.accountId === accountId)?.accountName || '',
                    bankName: availableAccounts.find(a => a.accountId === accountId)?.bankName || '',
                    lowBalanceThreshold: threshold
                  }];

            return { ...prev, accountThresholds: updatedThresholds };
        });
    };

    const getAccountThreshold = (accountId: number): number => {
        const accountThreshold = settings?.accountThresholds?.find(t => t.accountId === accountId);
        const availableAccount = availableAccounts.find(a => a.accountId === accountId);
        return accountThreshold?.lowBalanceThreshold ?? availableAccount?.lowBalanceThreshold ?? settings?.lowBalanceThreshold ?? 500;
    };

    const handleSave = async () => {
        if (!settings) return;

        try {
            setSaving(true);
            await updateNotificationSettings(settings);
            setSaveMessage("Settings saved successfully!");
            
            // Trigger a page reload to refresh threshold-dependent components
            // This ensures charts and auto-bookmark logic use the updated thresholds
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (error) {
            console.error("Failed to save notification settings:", error);
            setSaveMessage("Failed to save settings. Please try again.");
            setTimeout(() => setSaveMessage(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    const settingsGroups: SettingsGroup[] = [
        {
            title: "Balance Alerts",
            description: "Get notified when your account balances are running low",
            icon: <DollarSign className="w-5 h-5" />,
            settings: [
                {
                    key: "lowBalanceEnabled",
                    label: "Enable low balance alerts",
                    description: "Receive notifications when account balance falls below threshold",
                    type: "boolean"
                },
                {
                    key: "lowBalanceThreshold",
                    label: "Default low balance threshold",
                    description: "Default threshold for accounts without specific settings",
                    type: "number",
                    min: 0,
                    max: 10000,
                    step: 50,
                    dependsOn: "lowBalanceEnabled"
                }
            ]
        },
        {
            title: "Due Date Reminders",
            description: "Stay on top of debt and loan payment deadlines",
            icon: <Calendar className="w-5 h-5" />,
            settings: [
                {
                    key: "dueDateEnabled",
                    label: "Enable due date reminders",
                    description: "Receive notifications before debts and loans are due",
                    type: "boolean"
                },
                {
                    key: "dueDateDaysBefore",
                    label: "Days before due date",
                    description: "How many days in advance to send reminders",
                    type: "number",
                    min: 1,
                    max: 30,
                    step: 1,
                    dependsOn: "dueDateEnabled"
                }
            ]
        },
        {
            title: "Spending Alerts",
            description: "Monitor your spending habits and budget limits",
            icon: <TrendingUp className="w-5 h-5" />,
            settings: [
                {
                    key: "spendingAlertsEnabled",
                    label: "Enable spending alerts",
                    description: "Get notified when approaching monthly spending limits",
                    type: "boolean"
                },
                {
                    key: "monthlySpendingLimit",
                    label: "Monthly spending limit",
                    description: "Alert when spending reaches 90% of this limit",
                    type: "number",
                    min: 100,
                    max: 50000,
                    step: 100,
                    dependsOn: "spendingAlertsEnabled"
                }
            ]
        },
        {
            title: "Investment Alerts",
            description: "Keep track of investment maturity dates and opportunities",
            icon: <Shield className="w-5 h-5" />,
            settings: [
                {
                    key: "investmentAlertsEnabled",
                    label: "Enable investment alerts",
                    description: "Receive notifications about investment maturity and updates",
                    type: "boolean"
                }
            ]
        },
        {
            title: "Auto-Bookmark Settings",
            description: "Automatically bookmark high-value income and expense transactions",
            icon: <Bookmark className="w-5 h-5" />,
            settings: [
                {
                    key: "autoBookmarkEnabled",
                    label: "Enable auto-bookmarking",
                    description: "Automatically bookmark transactions that exceed threshold amounts",
                    type: "boolean"
                },
                {
                    key: "highValueIncomeThreshold",
                    label: "High-value income threshold",
                    description: "Income amounts above this value will be auto-bookmarked",
                    type: "number",
                    min: 1000,
                    max: 1000000,
                    step: 1000,
                    dependsOn: "autoBookmarkEnabled"
                },
                {
                    key: "highValueExpenseThreshold",
                    label: "High-value expense threshold",
                    description: "Expense amounts above this value will be auto-bookmarked",
                    type: "number",
                    min: 500,
                    max: 500000,
                    step: 500,
                    dependsOn: "autoBookmarkEnabled"
                }
            ]
        },
        {
            title: "Delivery Preferences",
            description: "Choose how you want to receive notifications",
            icon: <Bell className="w-5 h-5" />,
            settings: [
                {
                    key: "pushNotifications",
                    label: "In-app notifications",
                    description: "Show notifications in the app interface",
                    type: "boolean"
                },
                {
                    key: "emailNotifications",
                    label: "Email notifications",
                    description: "Send notifications to your email address",
                    type: "boolean"
                }
            ]
        }
    ];

    if (isLoading) {
        return (
            <div className="space-y-8">
                {/* Save button loading */}
                <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                
                {/* Grid layout for loading cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-lg border p-6 space-y-4">
                            <div className="h-6 bg-gray-200 rounded-md animate-pulse w-48" />
                            <div className="space-y-3">
                                <div className="h-4 bg-gray-100 rounded-md animate-pulse w-full" />
                                <div className="h-4 bg-gray-100 rounded-md animate-pulse w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Account-specific section loading */}
                <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="text-center py-12">
                <Bell className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Unable to load settings</h3>
                <p className="mt-1 text-sm text-gray-500">Please refresh the page and try again.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Save Button and Status - Full Width */}
            <div className="bg-white rounded-lg border p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? "Saving..." : "Save Settings"}
                        </button>
                        {saveMessage && (
                            <span className={`text-sm font-medium ${
                                saveMessage.includes("success") ? "text-green-600" : "text-red-600"
                            }`}>
                                {saveMessage}
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-gray-500">
                        Changes are saved automatically when you click "Save Settings"
                    </div>
                </div>
            </div>

            {/* Settings Groups - Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {settingsGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="bg-white rounded-lg border hover:shadow-md transition-shadow">
                        {/* Group Header */}
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    {group.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-medium text-gray-900">{group.title}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                                </div>
                            </div>
                        </div>

                        {/* Group Settings */}
                        <div className="p-6 space-y-6">
                            {group.settings.map((setting) => {
                                const isDependent = setting.dependsOn && !settings[setting.dependsOn];
                                
                                return (
                                    <div
                                        key={setting.key}
                                        className={`${isDependent ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 pr-4">
                                                <label className="text-sm font-medium text-gray-900">
                                                    {setting.label}
                                                </label>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {setting.description}
                                                </p>
                                            </div>
                                            
                                            <div className="flex-shrink-0">
                                                {setting.type === 'boolean' ? (
                                                    <div className="flex items-center">
                                                        <button
                                                            type="button"
                                                            disabled={isDependent}
                                                            onClick={() => handleSettingChange(setting.key, !settings[setting.key])}
                                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed ${
                                                                settings[setting.key] 
                                                                    ? 'bg-blue-600' 
                                                                    : 'bg-gray-200'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                    settings[setting.key] 
                                                                        ? 'translate-x-5' 
                                                                        : 'translate-x-0'
                                                                }`}
                                                            />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm text-gray-500">{currency}</span>
                                                        <input
                                                            type="number"
                                                            disabled={isDependent}
                                                            value={settings[setting.key] as number}
                                                            onChange={(e) => handleSettingChange(setting.key, parseInt(e.target.value) || 0)}
                                                            min={setting.min}
                                                            max={setting.max}
                                                            step={setting.step}
                                                            className="w-28 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Account-Specific Thresholds Section */}
            {settings.lowBalanceEnabled && availableAccounts.length > 0 && (
                <div className="bg-white rounded-lg border">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <Settings className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-medium text-gray-900">Account-Specific Thresholds</h3>
                                <p className="text-sm text-gray-500">Set different low balance thresholds for each of your accounts</p>
                            </div>
                        </div>
                    </div>

                    {/* Account Threshold Settings - Grid Layout */}
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                            {availableAccounts.map((account) => (
                                <div
                                    key={account.accountId}
                                    className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center space-x-3 mb-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <Earth className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-medium text-gray-900 truncate">
                                                {account.accountName}
                                            </h4>
                                            <p className="text-sm text-gray-500 truncate">{account.bankName}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-500 flex-shrink-0">{currency}</span>
                                        <input
                                            type="number"
                                            value={getAccountThreshold(account.accountId)}
                                            onChange={(e) => handleAccountThresholdChange(account.accountId, parseInt(e.target.value) || 0)}
                                            min={0}
                                            max={10000}
                                            step={50}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Threshold"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <Settings className="h-5 w-5 text-blue-400" />
                                </div>
                                <div className="ml-3">
                                    <h4 className="text-sm font-medium text-blue-800">
                                        How it works
                                    </h4>
                                    <div className="mt-1 text-sm text-blue-700">
                                        Each account can have its own low balance threshold. If an account doesn't have a specific threshold set, it will use the default threshold ({currency}{settings.lowBalanceThreshold}).
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 