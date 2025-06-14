"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");

  useEffect(() => {
    // If it's an access denied error, redirect to subscribe page
    if (error === "AccessDenied") {
      router.push("/subscribe?reason=unauthorized");
    }
  }, [error, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Access Restricted
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your email is not authorized to access this application.
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.push("/subscribe?reason=unauthorized")}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Subscribe to Get Access
            </button>
          </div>
          <div className="mt-4">
            <button
              onClick={() => router.push("/signin")}
              className="text-indigo-600 hover:text-indigo-500 text-sm"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
} 