"use client";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

export const SidebarItem = ({
  href,
  title,
  icon,
  showSeparator = false,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
  showSeparator?: boolean;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const selected = pathname === href;

  return (
    <div>
      {showSeparator && (
        <div className="mx-2 my-3 border-t border-slate-300"></div>
      )}
      <div
        className={`flex ${selected ? "text-[#6a51a6]" : "text-slate-500"} cursor-pointer  p-2 pl-8`}
        onClick={() => {
          router.push(href);
        }}
      >
        <div className="pr-2">{icon}</div>
        <div
          className={`font-bold ${selected ? "text-[#6a51a6]" : "text-slate-500"}`}
        >
          {title}
        </div>
      </div>
    </div>
  );
};
