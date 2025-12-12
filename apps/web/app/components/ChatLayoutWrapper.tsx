"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ChatLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatPage = pathname === "/chat";

  useEffect(() => {
    if (isChatPage) {
      // Make page unscrollable for chat
      document.body.style.overflow = "hidden";
      
      // Hide footer on chat page
      const footer = document.querySelector("footer");
      if (footer) {
        footer.style.display = "none";
      }
      
      // Remove padding from main content container for chat
      const mainContainer = document.querySelector(".flex-grow");
      if (mainContainer) {
        (mainContainer as HTMLElement).style.padding = "0";
      }
    } else {
      // Restore normal layout
      document.body.style.overflow = "";
      
      // Show footer
      const footer = document.querySelector("footer");
      if (footer) {
        footer.style.display = "";
      }
      
      // Restore padding to main content container
      const mainContainer = document.querySelector(".flex-grow");
      if (mainContainer) {
        (mainContainer as HTMLElement).style.padding = "";
      }
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
      
      const footer = document.querySelector("footer");
      if (footer) {
        footer.style.display = "";
      }
      
      const mainContainer = document.querySelector(".flex-grow");
      if (mainContainer) {
        (mainContainer as HTMLElement).style.padding = "";
      }
    };
  }, [isChatPage]);

  return <>{children}</>;
}
