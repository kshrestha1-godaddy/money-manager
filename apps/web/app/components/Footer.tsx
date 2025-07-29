import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="w-full py-8 border-t mt-auto bg-white/90">
            <div className="container mx-auto px-4">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
                    {/* Logo and Description */}
                    <div className="flex flex-col items-start">
                        <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity mb-3">
                            <Image 
                                src="/logo.png" 
                                alt="Money Manager Logo" 
                                width={40} 
                                height={40} 
                                className="rounded-full mr-2"
                                priority={false}
                                loading="lazy"
                            />
                            <span className="text-gray-700 font-medium text-lg">Money Manager</span>
                        </Link>
                        <p className="text-gray-600 text-sm leading-relaxed">
                            Secure personal finance management with end-to-end encryption. 
                            Track your income, expenses, and build wealth with confidence.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-gray-700 font-semibold mb-3">Quick Links</h3>
                        <div className="text-sm">
                            <Link href="/dashboard" className="text-gray-600 hover:text-gray-800 transition-colors">Dashboard</Link>
                            <span className="mx-2 text-gray-400">|</span>
                            <Link href="/incomes" className="text-gray-600 hover:text-gray-800 transition-colors">Incomes</Link>
                            <span className="mx-2 text-gray-400">|</span>
                            <Link href="/expenses" className="text-gray-600 hover:text-gray-800 transition-colors">Expenses</Link>
                            <span className="mx-2 text-gray-400">|</span>
                            <Link href="/accounts" className="text-gray-600 hover:text-gray-800 transition-colors">Accounts</Link>
                            <span className="mx-2 text-gray-400">|</span>
                            <Link href="/investments" className="text-gray-600 hover:text-gray-800 transition-colors">Investments</Link>
                        </div>
                    </div>

                    {/* Support and Security */}
                    <div>
                        <h3 className="text-gray-700 font-semibold mb-3">Support & Security</h3>
                        <div className="space-y-2">
                            <p className="text-gray-600 text-sm">
                                <span className="font-medium">Contact:</span> Available for support and discussions
                            </p>
                            <p className="text-gray-600 text-sm">
                                <span className="font-medium">Email:</span> 
                                <a href="mailto:kamalandshrestha@gmail.com" className="text-blue-600 hover:text-blue-800 ml-1">
                                    Get in touch
                                </a>
                            </p>
                            <div className="flex items-center mt-3">
                                <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span className="text-gray-600 text-sm">End-to-end encrypted data</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t pt-6 text-center">
                    <div className="text-sm text-gray-500">
                        <span>&copy; {new Date().getFullYear()} Kamal Shrestha. All rights reserved.</span>
                        <span className="mx-2">|</span>
                        <span>Privacy Policy</span>
                        <span className="mx-2">|</span>
                        <span>Terms of Service</span>
                        <span className="mx-2">|</span>
                        <span>Cookie Policy</span>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">
                        Your financial data is protected with bank-grade encryption and stored securely. 
                        We never share your personal information with third parties.
                    </p>
                </div>
            </div>
        </footer>
    );
}