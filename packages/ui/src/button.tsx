"use client";

import { ReactNode } from "react";

interface ButtonProps {
    children: ReactNode;
    onClick: () => void;
}

export const Button = ({ onClick, children }: ButtonProps) => {
    return (
        <button
            onClick={onClick}
            type="button"
            className="ui-text-white ui-bg-gray-800 ui-hover:bg-gray-900 ui-focus:outline-none ui-focus:ring-4 ui-focus:ring-gray-300 ui-font-medium ui-rounded-lg ui-text-sm ui-px-5 ui-py-2.5 ui-me-2 ui-mb-2"
        >
            {children}
        </button>
    );
};
