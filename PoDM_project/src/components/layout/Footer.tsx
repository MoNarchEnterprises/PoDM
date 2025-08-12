import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-gray-500">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm">
                <div className="space-x-4">
                    <span>&copy; {new Date().getFullYear()} PoDM. All rights reserved.</span>
                    <a href="/terms" className="hover:text-gray-400">Terms of Service</a>
                    <a href="/privacy" className="hover:text-gray-400">Privacy Policy</a>
                    <a href="/admin" className="hover:text-gray-400">Admin</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
