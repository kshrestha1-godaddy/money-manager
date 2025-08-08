import { Suspense } from "react";
import { NotificationSettings } from "../../components/notification/NotificationSettings";

function NotificationSettingsLoading() {
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

export default function NotificationsPage() {
    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-8">
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