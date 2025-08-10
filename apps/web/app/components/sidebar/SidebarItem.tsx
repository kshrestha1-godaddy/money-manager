"use client";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

export const SidebarItem = ({
  href,
  title,
  icon,
  showSeparator = false,
  onItemClick,
  id,
  openInNewTab = false,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
  showSeparator?: boolean;
  onItemClick?: () => void;
  id?: string;
  openInNewTab?: boolean;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const selected = pathname === href;

  const handleClick = () => {
    if (openInNewTab && typeof window !== "undefined") {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      router.push(href);
    }
    onItemClick?.();
  };

  return (
    <div>
      {showSeparator && (
        <div className="mx-2 md:mx-3 my-3 md:my-5 border-t border-gray-200"></div>
      )}
      <div
        id={id}
        className={`flex items-center ${
          selected ? "text-white bg-[#705ba0] shadow-md" : "text-slate-600 hover:text-slate-700 hover:bg-gray-50"
        } cursor-pointer p-2 md:p-4 pl-8 md:pl-6 rounded-md mx-2 md:mx-3 transition-colors`}
        onClick={handleClick}
      >
        <div className="pr-2 md:pr-3">{icon}</div>
        <div
          className={`font-medium text-sm md:text-base ${
            selected ? "text-white font-semibold" : "text-slate-600"
          }`}
        >
          {title}
        </div>
      </div>
    </div>
  );
};
