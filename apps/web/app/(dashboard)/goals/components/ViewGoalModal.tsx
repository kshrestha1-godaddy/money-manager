import React from 'react';

interface ViewGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: any;
  onEdit: () => void;
  onDelete: () => void;
}

export function ViewGoalModal({ isOpen, onClose, goal, onEdit, onDelete }: ViewGoalModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="mt-3 text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">View Goal</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Goal details view coming soon...
          </p>
          <div className="items-center px-4 py-3">
            <button
              className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}