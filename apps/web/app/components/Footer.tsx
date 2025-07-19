import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="w-full py-4 border-t mt-auto bg-white/90">
            <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between">
                <div className="flex items-center mb-4 sm:mb-0">
                    <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
                        <Image 
                            src="/logo.png" 
                            alt="Money Manager Logo" 
                            width={30} 
                            height={30} 
                            className="rounded-full mr-2" 
                        />
                        <span className="text-gray-700 font-medium">Money Manager</span>
                    </Link>
                </div>
                <div className="text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} Kamal Shrestha
                </div>
            </div>
        </footer>
    );
}