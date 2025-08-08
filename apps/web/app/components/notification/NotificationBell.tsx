"use client";

import { useState, useEffect } from "react";
import { Bell, X, Check, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    getNotifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    NotificationData 
} from "../../actions/notifications";
import { useNotificationContext } from "./NotificationProvider";

interface NotificationBellProps {
    className?: string;
}

export function NotificationBell({ className = "" }: NotificationBellProps) {
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showClearDialog, setShowClearDialog] = useState(false);
    const router = useRouter();
    const { unreadCount: contextUnreadCount, refreshUnreadCount } = useNotificationContext();
    
    // Calculate local unread count from notifications
    const localUnreadCount = notifications.filter(n => !n.isRead).length;

    // Load notifications
    const loadNotifications = async () => {
        try {
            setIsLoading(true);
            const notificationsData = await getNotifications();
            setNotifications(notificationsData);
        } catch (error) {
            console.error("Failed to load notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Load notifications on mount
    useEffect(() => {
        loadNotifications();
    }, []);

    // Handle mark as read
    const handleMarkAsRead = async (notificationId: number) => {
        try {
            await markNotificationAsRead(notificationId);
            await Promise.all([loadNotifications(), refreshUnreadCount()]);
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    };

    // Handle mark all as read
    const handleMarkAllAsRead = async () => {
        try {
            await markAllNotificationsAsRead();
            await Promise.all([loadNotifications(), refreshUnreadCount()]);
        } catch (error) {
            console.error("Failed to mark all notifications as read:", error);
        }
    };

    // Handle delete notification
    const handleDeleteNotification = async (notificationId: number) => {
        try {
            await deleteNotification(notificationId);
            await Promise.all([loadNotifications(), refreshUnreadCount()]);
        } catch (error) {
            console.error("Failed to delete notification:", error);
        }
    };

    // Handle clear all notifications
    const handleClearAllNotifications = async () => {
        setShowClearDialog(true);
    };

    // Confirm and execute clear all notifications
    const confirmClearAllNotifications = async () => {
        try {
            const result = await clearAllNotifications();
            await Promise.all([loadNotifications(), refreshUnreadCount()]);
            
            // Close both dialogs
            setShowClearDialog(false);
            setIsOpen(false);
            
            // Show success message (optional)
            if (result.deletedCount > 0) {
                console.log(`Successfully deleted ${result.deletedCount} notifications`);
            }
        } catch (error) {
            console.error("Failed to clear all notifications:", error);
            alert("Failed to clear notifications. Please try again.");
        }
    };

    // Handle notification click
    const handleNotificationClick = async (notification: NotificationData) => {
        if (!notification.isRead) {
            // Update local state immediately
            setNotifications(prev => 
                prev.map(n => 
                    n.id === notification.id 
                        ? { ...n, isRead: true }
                        : n
                )
            );
            
            // Make backend call to mark as read (but don't wait for it)
            markNotificationAsRead(notification.id).catch(error => {
                console.error("Failed to mark notification as read:", error);
                // Revert local state on error
                setNotifications(prev => 
                    prev.map(n => 
                        n.id === notification.id 
                            ? { ...n, isRead: false }
                            : n
                    )
                );
            });
        }
        
        if (notification.actionUrl) {
            // Make sure we're using the correct path format
            let url = notification.actionUrl;
            
            // If it doesn't start with a slash, add one
            if (!url.startsWith('/')) {
                url = `/${url}`;
            }
            
            router.push(url);
        }
    };

    // Get priority color
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'URGENT':
                return 'bg-red-500';
            case 'HIGH':
                return 'bg-orange-500';
            case 'NORMAL':
                return 'bg-blue-500';
            case 'LOW':
                return 'bg-gray-500';
            default:
                return 'bg-blue-500';
        }
    };

    // Get notification icon using sidebar-style icons with consistent black color
    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'LOW_BALANCE':
                return (
                    <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'DUE_DATE_REMINDER':
            case 'DEBT_REMINDER':
            case 'LOAN_REMINDER':
                return (
                    <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'SPENDING_ALERT':
                return (
                    <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case 'INVESTMENT_MATURITY':
                return (
                    <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                );
            case 'PASSWORD_EXPIRY':
                return (
                    <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                );
            case 'MONTHLY_SUMMARY':
                return (
                    <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                );
        }
    };

    // Format relative time with improved readability
    const formatRelativeTime = (date: Date) => {
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMinutes < 1) {
            return 'Just now';
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
        } else if (diffInHours < 24) {
            return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
        } else if (diffInDays < 7) {
            return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
        } else {
            // Format date: "Jan 15, 2023"
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
        }
    };

    return (
        <div className={`relative ${className}`}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Notifications"
            >
                <Bell size={22} />
                {localUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {localUnreadCount > 99 ? '99+' : localUnreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-[450px] bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
                        <div className="flex items-center space-x-3">
                            {localUnreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-sm text-gray-700 hover:text-gray-900 flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                                    disabled={isLoading}
                                >
                                    <Check size={14} />
                                    <span>Mark all read</span>
                                </button>
                            )}
                            <Link
                                href="/notifications"
                                className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                <Settings size={14} />
                                <span>Settings</span>
                            </Link>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-[450px] overflow-y-auto">
                        {isLoading ? (
                            <div className="p-6 text-center text-gray-500">
                                <div className="animate-spin mx-auto mb-3 h-8 w-8 border-2 border-gray-500 border-t-transparent rounded-full"></div>
                                <p>Loading notifications...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Bell size={56} className="mx-auto mb-3 text-gray-400" />
                                <p className="font-medium text-gray-600">No notifications yet</p>
                                <p className="text-sm mt-1">You're all caught up!</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                                        !notification.isRead ? 'bg-gray-50' : ''
                                    }`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex items-start space-x-4">
                                        {/* Icon */}
                                        <div className="mt-0.5">
                                            {getNotificationIcon(notification.type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <h4 className="text-base font-medium text-gray-900">
                                                    {notification.title}
                                                </h4>
                                            </div>
                                            <p className="text-sm mt-1 leading-relaxed text-gray-700"
                                                dangerouslySetInnerHTML={{ __html: notification.message }}
                                            ></p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-xs text-gray-500">
                                                    {formatRelativeTime(notification.createdAt)}
                                                </span>
                                                {!notification.isRead && (
                                                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    {/* Footer with Action Buttons */}
                    <div className="p-3 border-t border-gray-100">
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            >
                                Close Notifications
                            </button>
                            {notifications.length > 0 && (
                                <button
                                    onClick={handleClearAllNotifications}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors flex items-center justify-center"
                                >
                                    <Trash2 size={14} className="mr-1" />
                                    Clear All
                                </button>
                            )}
                        </div>
                    </div>


                </div>
            )}

            {/* Clear All Confirmation Dialog */}
            {showClearDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowClearDialog(false)} />
                    <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-8 border border-gray-100 my-auto">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                Clear All Notifications?
                            </h3>
                            <p className="text-gray-600 text-sm">
                                This action cannot be undone.
                            </p>
                        </div>

                        {/* Warning */}
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-lg">
                            <div className="flex">
                                <div className="ml-3">
                                    <p className="text-sm text-amber-800">
                                        <span className="font-medium">Important:</span> Make sure you've addressed the underlying causes of these notifications, or they may reappear.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowClearDialog(false)}
                                className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmClearAllNotifications}
                                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Backdrop with subtle animation */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[1px] transition-opacity duration-200"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
} 