import React from 'react';

interface AuthLayoutProps {
    children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <div className="text-purple-500 font-bold text-3xl">PoDM</div>
                </div>
                <main>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AuthLayout;
