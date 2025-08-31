"use client";

import React from 'react';
import { PasswordShareResult } from '../actions/password-sharing';

interface PasswordShareSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  result: PasswordShareResult | null;
}

export function PasswordShareSuccessDialog({ isOpen, onClose, result }: PasswordShareSuccessDialogProps) {
  if (!isOpen || !result) return null;

  const hasSuccess = result.success && result.sharedCount > 0;
  const hasFailures = result.failedEmails.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {hasSuccess ? (
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 14c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Password Sharing {hasSuccess ? 'Complete' : 'Failed'}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Success Content */}
          {hasSuccess && (
            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-green-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-green-800 mb-1">
                      Successfully Shared!
                    </h3>
                    <p className="text-sm text-green-700">
                      Your passwords have been shared with{' '}
                      <span className="font-semibold">{result.sharedCount}</span>{' '}
                      contact{result.sharedCount > 1 ? 's' : ''}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Contacts notified:</span>
                  <span className="font-medium">{result.sharedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-green-600 font-medium">✓ Complete</span>
                </div>
              </div>
            </div>
          )}

          {/* Failure Content */}
          {hasFailures && (
            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-red-800 mb-1">
                      Some Emails Failed
                    </h3>
                    <p className="text-sm text-red-700">
                      Failed to send to {result.failedEmails.length} contact{result.failedEmails.length > 1 ? 's' : ''}:
                    </p>
                    <ul className="list-disc list-inside text-sm text-red-600 mt-2 ml-2">
                      {result.failedEmails.map((email, index) => (
                        <li key={index}>{email}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Reminder */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-1">Security Reminder</h4>
                <p className="text-sm text-blue-700">
                  Your passwords have been sent via encrypted email. Recipients should store them securely and delete the emails after saving the information.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className={`px-6 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                hasSuccess 
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                  : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
              }`}
            >
              {hasSuccess ? 'Great!' : 'Got it'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
