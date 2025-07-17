import { Suspense } from "react";
import { NotificationSettings } from "../../components/NotificationSettings";

function NotificationSettingsLoading() {
    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="h-8 bg-gray-200 rounded-md animate-pulse w-64" />
            <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
            </div>
        </div>
    );
}

export default function NotificationsPage() {
    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
                <p className="text-gray-600 mt-2">
                    Manage your notification preferences and stay informed about your financial activities.
                </p>
            </div>

            <Suspense fallback={<NotificationSettingsLoading />}>
                <NotificationSettings />
            </Suspense>
        </div>
    );
} 