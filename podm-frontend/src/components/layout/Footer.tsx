import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-gray-400 border-t border-gray-800">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-sm">
                        &copy; {new Date().getFullYear()} PoDM. All rights reserved.
                    </div>
                    <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
                        <a href="/terms" className="hover:text-white transition-colors">Terms</a>
                        <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
                        <a href="/support" className="hover:text-white transition-colors">Support</a>
                        <a href="/admin" className="hover:text-purple-400 transition-colors">Admin</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
