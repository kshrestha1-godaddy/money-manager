"use client";

import React, { useState, useEffect } from 'react';
import { sharePasswordsWithEmergencyContacts, PasswordShareResult } from '../../../actions/password-sharing';
import { getEmergencyEmails, EmergencyEmailData } from '../../../actions/emergency-emails';

interface SharePasswordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: PasswordShareResult) => void;
}

export function SharePasswordsModal({ isOpen, onClose, onSuccess }: SharePasswordsModalProps) {
  const [secretKey, setSecretKey] = useState('');
  const [shareReason, setShareReason] = useState<'MANUAL'>('MANUAL');
  const [emergencyEmails, setEmergencyEmails] = useState<EmergencyEmailData[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);

  // Load emergency emails when modal opens
  useEffect(() => {
    if (isOpen) {
      loadEmergencyEmails();
      setSecretKey('');
      setError(null);
      setSelectedEmails([]);
    }
  }, [isOpen]);

  const loadEmergencyEmails = async () => {
    try {
      setIsLoadingEmails(true);
      const emails = await getEmergencyEmails();
      setEmergencyEmails(emails);
      setSelectedEmails(emails.map(e => e.email)); // Select all by default
    } catch (error) {
      setError('Failed to load emergency emails');
      console.error('Error loading emergency emails:', error);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!secretKey.trim()) {
      setError('Secret key is required to decrypt passwords');
      return;
    }

    if (selectedEmails.length === 0) {
      setError('Please select at least one email to share passwords with');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await sharePasswordsWithEmergencyContacts({
        secretKey: secretKey.trim(),
        reason: shareReason,
        specificEmails: selectedEmails
      });

      if (result.success) {
        onSuccess?.(result);
        onClose();
      } else {
        setError(result.error || 'Failed to share passwords');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to share passwords');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailToggle = (email: string) => {
    setSelectedEmails(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const handleSelectAll = () => {
    setSelectedEmails(emergencyEmails.map(e => e.email));
  };

  const handleSelectNone = () => {
    setSelectedEmails([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Share Passwords
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
            </button>
          </div>

          {/* Warning Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-sm">
                <p className="text-yellow-700 font-medium">Security Warning</p>
                <p className="text-yellow-600 mt-1">
                  This will share all your passwords in plain text via email. Only proceed if you fully trust all recipients.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Share Reason - Hidden since only MANUAL is available */}
            <input type="hidden" value={shareReason} />

            {/* Emergency Emails */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Recipients ({selectedEmails.length} selected)
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectNone}
                    className="text-xs text-gray-600 hover:text-gray-800"
                  >
                    Select None
                  </button>
                </div>
              </div>
              
              {isLoadingEmails ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  Loading emergency emails...
                </div>
              ) : emergencyEmails.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  No emergency emails configured. Please set up emergency emails in your settings first.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                  {emergencyEmails.map((emailData) => (
                    <label key={emailData.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEmails.includes(emailData.email)}
                        onChange={() => handleEmailToggle(emailData.email)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {emailData.email}
                        </div>
                        {emailData.label && (
                          <div className="text-xs text-gray-500 truncate">
                            {emailData.label}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Secret Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secret Key *
              </label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Enter your secret key to decrypt passwords"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This is the secret key you use to encrypt/decrypt your passwords
              </p>
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
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || emergencyEmails.length === 0 || selectedEmails.length === 0}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isLoading || emergencyEmails.length === 0 || selectedEmails.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading ? 'Sharing...' : 'Share Passwords'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
