// src/components/shared/VerificationBanner.tsx

import React from 'react';
import { Shield, Clock } from 'lucide-react';
import Button from '../ui/Button';

interface VerificationBannerProps {
    status: 'pending verification' | 'suspended' | 'banned';
}

const VerificationBanner = ({ status }: VerificationBannerProps) => {
    const messages = {
        'pending verification': {
            icon: Clock,
            color: 'blue',
            title: 'Your verification is under review.',
            text: 'You can set up your profile and upload content, but you cannot message fans or receive payments until approved (usually within 48 hours).'
        },
        'suspended': {
            icon: Shield,
            color: 'yellow',
            title: 'Your account is currently suspended.',
            text: 'Please contact support to resolve any issues. You cannot currently receive payments or message fans.'
        },
        'banned': {
            icon: Shield,
            color: 'red',
            title: 'Your account has been banned.',
            text: 'This account is no longer active. Please contact support for more information.'
        }
    } as const;

    const config = messages[status];
    if (!config) return null;

    const colorClasses = {
        blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
        yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
        red: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    };

    return (
        <div className={`p-4 rounded-lg m-4 sm:m-6 lg:m-8 ${colorClasses[config.color]}`}>
            <div className="flex">
                <div className="flex-shrink-0">
                    <config.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="ml-3 flex-1 md:flex md:justify-between">
                    <div>
                        <p className="text-sm font-bold">{config.title}</p>
                        <p className="mt-1 text-sm">{config.text}</p>
                    </div>
                    <p className="mt-2 md:mt-0 md:ml-6">
                        <Button variant="ghost" size="sm" className="whitespace-nowrap font-medium">
                            Contact Support
                        </Button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default VerificationBanner;