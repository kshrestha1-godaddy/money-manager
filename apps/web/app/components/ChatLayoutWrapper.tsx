"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ChatLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatPage = pathname === "/chat";

  useEffect(() => {
    if (isChatPage) {
      // Make page unscrollable and full height
      document.body.style.overflow = "hidden";
      document.body.style.height = "100vh";
      
      // Hide footer
      const footer = document.querySelector("footer");
      if (footer) {
        footer.style.display = "none";
      }
      
      // Hide navbar
      const navbar = document.querySelector("nav");
      if (navbar) {
        navbar.style.display = "none";
      }
      
      // Remove padding from main content container  
      const mainContainer = document.querySelector(".flex-grow");
      if (mainContainer) {
        (mainContainer as HTMLElement).style.padding = "0";
        (mainContainer as HTMLElement).style.height = "100vh";
      }
    } else {
      // Restore normal layout
      document.body.style.overflow = "";
      document.body.style.height = "";
      
      // Show footer
      const footer = document.querySelector("footer");
      if (footer) {
        footer.style.display = "";
      }
      
      // Show navbar  
      const navbar = document.querySelector("nav");
      if (navbar) {
        navbar.style.display = "";
      }
      
      // Restore padding to main content container
      const mainContainer = document.querySelector(".flex-grow");
      if (mainContainer) {
        (mainContainer as HTMLElement).style.padding = "";
        (mainContainer as HTMLElement).style.height = "";
      }
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
      
      const footer = document.querySelector("footer");
      if (footer) {
        footer.style.display = "";
      }
      
      const navbar = document.querySelector("nav");
      if (navbar) {
        navbar.style.display = "";
      }
      
      const mainContainer = document.querySelector(".flex-grow");
      if (mainContainer) {
        (mainContainer as HTMLElement).style.padding = "";
        (mainContainer as HTMLElement).style.height = "";
      }
    };
  }, [isChatPage]);

  return <>{children}</>;
}
