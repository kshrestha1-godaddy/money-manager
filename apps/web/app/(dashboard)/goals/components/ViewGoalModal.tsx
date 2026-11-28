"use client";

import { GOALS_MODAL_MAX_WIDTH } from "../../constants/goals-constants";
import { PasswordGatedButton } from "@repo/applock";

interface ViewGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: any;
  onEdit: () => void;
  onDelete?: (appLockPassword: string) => void | Promise<void>;
  isDeleting?: boolean;
}

export function ViewGoalModal({
  isOpen,
  onClose,
  goal,
  onEdit,
  onDelete,
  isDeleting = false,
}: ViewGoalModalProps) {
  if (!isOpen || !goal) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-50">
      <div className={`relative top-20 mx-auto w-[calc(100%-2rem)] ${GOALS_MODAL_MAX_WIDTH} rounded-md border bg-white p-5 shadow-lg dark:bg-gray-800`}>
        <div className="mt-1">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{goal.title}</h3>
          {goal.description ? (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{goal.description}</p>
          ) : null}
          <div className="mt-3 space-y-1 text-sm text-gray-500 dark:text-gray-400">
            {goal.category ? <p>Category: {goal.category}</p> : null}
            {goal.status ? <p>Status: {String(goal.status).replaceAll("_", " ")}</p> : null}
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              className="w-full rounded-md bg-blue-500 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              onClick={onEdit}
            >
              Edit
            </button>
            {onDelete ? (
              <PasswordGatedButton
                disabled={isDeleting}
                className="w-full rounded-md bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                prompt={{
                  title: "Delete goal",
                  description:
                    "This cannot be undone. Enter your lock screen password to delete this goal.",
                  confirmLabel: "Delete goal",
                }}
                onConfirm={async (appLockPassword) => {
                  await onDelete(appLockPassword);
                }}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </PasswordGatedButton>
            ) : null}
            <button
              type="button"
              className="w-full rounded-md bg-gray-100 px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
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
