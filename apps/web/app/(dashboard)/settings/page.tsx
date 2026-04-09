import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage notifications, emergency contacts, and other preferences.
        </p>
      </div>

      <ul className="space-y-2">
        <li>
          <Link
            href="/notifications"
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:bg-gray-50"
          >
            Notification settings
            <span className="text-gray-400" aria-hidden>
              →
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/settings/emergency-emails"
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:bg-gray-50"
          >
            Emergency contacts
            <span className="text-gray-400" aria-hidden>
              →
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
