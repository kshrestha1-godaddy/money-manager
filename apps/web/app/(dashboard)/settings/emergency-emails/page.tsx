"use client";

import React, { useState, useEffect } from "react";
import { getEmergencyEmails, addEmergencyEmail, updateEmergencyEmail, deleteEmergencyEmail, EmergencyEmailData, CreateEmergencyEmailData } from "../../../actions/emergency-emails";
import { getPasswordSharingHistory } from "../../../actions/password-sharing";

export default function EmergencyEmailsPage() {
  const [emails, setEmails] = useState<EmergencyEmailData[]>([]);
  const [sharingHistory, setSharingHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmail, setEditingEmail] = useState<EmergencyEmailData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<EmergencyEmailData | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [emailsData, historyData] = await Promise.all([
        getEmergencyEmails(),
        getPasswordSharingHistory(5)
      ]);
      setEmails(emailsData);
      setSharingHistory(historyData);
    } catch (error) {
      console.error("Error loading emergency emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async (data: CreateEmergencyEmailData) => {
    try {
      const newEmail = await addEmergencyEmail(data);
      setEmails(prev => [newEmail, ...prev]);
    } catch (error) {
      throw error;
    }
  };

  const handleUpdateEmail = async (data: { email: string; label?: string }) => {
    try {
      if (!editingEmail) return;
      
      const updatedEmail = await updateEmergencyEmail({
        id: editingEmail.id,
        ...data
      });
      
      setEmails(prev => prev.map(e => e.id === updatedEmail.id ? updatedEmail : e));
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteEmail = async (email: EmergencyEmailData) => {
    try {
      await deleteEmergencyEmail(email.id);
      setEmails(prev => prev.filter(e => e.id !== email.id));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting email:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Emergency Email Contacts</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Emergency Email Contacts</h1>
          <p className="text-gray-600 mt-1">
            Configure emails that will receive your passwords if you're inactive for more than 15 days
          </p>
        </div>
        <button
          onClick={() => {
            setEditingEmail(null);
            setShowAddModal(true);
          }}
          className="h-10 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          Add Emergency Contact
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-amber-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="text-sm">
            <p className="text-amber-700 font-medium">How Emergency Sharing Works</p>
            <p className="text-amber-600 mt-1">
              If you don't check into your account for more than 15 days, your encrypted passwords will be automatically decrypted and shared via email with these contacts. This is designed as a digital legacy feature for trusted family members or close friends.
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Emails List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Configured Contacts ({emails.length})
          </h2>
        </div>
        
        {emails.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No emergency contacts configured</h3>
            <p className="text-gray-600 mb-6">
              Add trusted contacts who should receive your passwords in case of emergency
            </p>
            <button
              onClick={() => {
                setEditingEmail(null);
                setShowAddModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Add Your First Contact
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {emails.map((email) => (
              <div key={email.id} className="p-6 flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {email.email}
                      </div>
                      {email.label && (
                        <div className="text-sm text-gray-500">
                          {email.label}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        Added {new Date(email.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setEditingEmail(email);
                      setShowAddModal(true);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(email)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sharing History */}
      {sharingHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Password Shares</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {sharingHistory.map((share, index) => (
              <div key={index} className="p-4 flex justify-between items-center text-sm">
                <div>
                  <div className="font-medium text-gray-900">{share.recipientEmail}</div>
                  <div className="text-gray-500">
                    {share.passwordCount} passwords shared • {share.shareReason.toLowerCase()}
                  </div>
                </div>
                <div className="text-gray-400">
                  {new Date(share.sentAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddEmergencyEmailModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingEmail(null);
          }}
          onSubmit={editingEmail ? handleUpdateEmail : handleAddEmail}
          initialData={editingEmail ? {
            email: editingEmail.email,
            label: editingEmail.label || ""
          } : undefined}
          isEditing={!!editingEmail}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          isOpen={!!showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(null)}
          onConfirm={() => handleDeleteEmail(showDeleteConfirm)}
          email={showDeleteConfirm.email}
        />
      )}
    </div>
  );
}

// Add Emergency Email Modal Component
interface AddEmergencyEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEmergencyEmailData) => Promise<void>;
  initialData?: { email: string; label: string };
  isEditing?: boolean;
}

function AddEmergencyEmailModal({ isOpen, onClose, onSubmit, initialData, isEditing }: AddEmergencyEmailModalProps) {
  const [email, setEmail] = useState(initialData?.email || "");
  const [label, setLabel] = useState(initialData?.label || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await onSubmit({ email: email.trim(), label: label.trim() || undefined });
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save email");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label (Optional)
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Spouse, Family, Trusted Friend"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isLoading ? 'Saving...' : (isEditing ? 'Update Contact' : 'Add Contact')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  email: string;
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm, email }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Delete Emergency Contact</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Are you sure you want to remove <strong>{email}</strong> from your emergency contacts? 
            They will no longer receive your passwords if your account becomes inactive.
          </p>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Delete Contact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
