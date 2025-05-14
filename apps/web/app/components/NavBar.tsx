"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@repo/ui/button";

export default function NavBar() {
  const { data: session, status } = useSession();

  // Wait until session is loaded to render anything session-dependent
  if (status === "loading") {
    return null; // or a loading skeleton
  }

  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 bg-white shadow-md mb-6">
      {/* Left side: User image if authenticated */}
      <div className="w-32 flex items-center">
        {status === "authenticated" && session?.user?.image && (
          <img
            src={session.user.image}
            alt={session.user.name || "User"}
            className="w-10 h-10 rounded-full object-cover border border-gray-300"
            referrerPolicy="no-referrer"
          />
        )}
      </div>



      {/* Center: User name */}
      <div className="flex-1 flex justify-center">
        {status === "authenticated" && session?.user?.name && (
            <span className="text-gray-700 font-bold text-lg">
                {session.user.name}
            </span>
        )}
      </div>



      {/* Right: Logout or Sign In button */}
      <div className="w-32 flex justify-end">
        {status === "authenticated" ? (
          <Button onClick={() => signOut({ callbackUrl: "/api/auth/signin" })}>
            Logout
          </Button>
        ) : status === "unauthenticated" ? (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => signIn()}
          >
            Sign In
          </button>
        ) : null}
      </div>
    </nav>
  );
} 