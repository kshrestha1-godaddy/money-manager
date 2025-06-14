"use client";

import { useState } from "react";
import { addSubscriber } from "../actions/subscribers";

export default function NewsletterForm() {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email) {
            setMessage("Please enter your email address.");
            setIsSuccess(false);
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setMessage("Please enter a valid email address.");
            setIsSuccess(false);
            return;
        }

        setIsLoading(true);
        setMessage("");

        try {
            const result = await addSubscriber({
                email: email.trim(),
                name: name.trim() || undefined,
                source: 'landing_page',
                tags: ['newsletter']
            });

            setMessage(result.message);
            setIsSuccess(result.success);

            if (result.success) {
                setEmail("");
                setName("");
            }
        } catch (error) {
            setMessage("Something went wrong. Please try again later.");
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Optional name field */}
                <div>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name (optional)"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                        disabled={isLoading}
                    />
                </div>

                {/* Email and submit button */}
                <div className="flex gap-4">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Your email"
                        required
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                        disabled={isLoading}
                    />
                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="px-8 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? "Subscribing..." : "Subscribe"}
                    </button>
                </div>
            </form>

            {/* Message display */}
            {message && (
                <div className={`mt-4 p-4 rounded-lg ${
                    isSuccess 
                        ? "bg-green-50 border border-green-200 text-green-700" 
                        : "bg-red-50 border border-red-200 text-red-700"
                }`}>
                    <p className="text-sm font-medium">{message}</p>
                </div>
            )}

            <p className="mt-4 text-sm text-gray-500">
                I have read and agree with the{" "}
                <a href="#" className="text-green-600 hover:underline">
                    Terms & Conditions
                </a>
            </p>
        </div>
    );
} 