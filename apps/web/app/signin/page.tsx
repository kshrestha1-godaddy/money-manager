"use client";

import { signIn, getProviders } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Provider {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
}

export default function SignIn() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    number: "",
    password: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProviders = async () => {
      const res = await getProviders();
      setProviders(res);
      setLoading(false);
    };
    fetchProviders();
  }, []);

  const handleSignIn = (providerId: string) => {
    signIn(providerId, { callbackUrl: "/dashboard" });
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (!formData.number || !formData.password) {
      setError("Please fill in all fields");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        number: formData.number,
        password: formData.password,
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid credentials. Please try again.");
      } else {
        // Redirect will be handled by NextAuth
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getProviderIcon = (providerId: string) => {
    switch (providerId.toLowerCase()) {
      case 'google':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'github':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter out credentials provider from OAuth providers
  const oauthProviders = providers ? Object.values(providers).filter(provider => provider.id !== 'credentials') : [];
  const hasCredentialsProvider = providers && providers.credentials;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">MoneyManager</span>
          </Link>
          
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            Welcome back
          </h2>
          <p className="text-gray-600">
            Sign in to your account to continue managing your finances
          </p>
        </div>

        {/* Sign-in Form */}
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg border border-gray-200">
          
          {/* Credentials Form */}
          {hasCredentialsProvider && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="number"
                  name="number"
                  type="text"
                  value={formData.number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your phone number"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          )}

          {/* Divider - only show if both credentials and OAuth providers exist */}
          {hasCredentialsProvider && oauthProviders.length > 0 && (
            <div className="mt-6 mb-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>
            </div>
          )}

          {/* OAuth Providers */}
          {oauthProviders.length > 0 && (
            <div className="space-y-4">
              {oauthProviders.map((provider) => (
                <button
                  key={provider.name}
                  onClick={() => handleSignIn(provider.id)}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    {getProviderIcon(provider.id)}
                    <span>Continue with {provider.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Security Note */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-500">
              Your data is encrypted and secure. We never store your passwords.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <span className="text-gray-500">Sign up is automatic when you sign in for the first time.</span>
          </p>
          <div className="mt-4">
            <Link 
              href="/" 
              className="text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 