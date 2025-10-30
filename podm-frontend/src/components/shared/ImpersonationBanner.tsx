import React, { useState, useEffect } from 'react';
import { Eye, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { User } from '@common/types/User';

const ImpersonationBanner = () => {
    const { user: originalUser, impersonatedUser, stopImpersonation } = useAuth();

    if (!originalUser || !impersonatedUser) {
        return null;
    }

    return (
        <div className="bg-yellow-500 text-black font-bold p-3 flex items-center justify-center text-sm z-50 sticky top-0">
            <Eye className="w-5 h-5 mr-3 animate-pulse" />
            <span>
                You are impersonating <span className="underline">{impersonatedUser.profile.name}</span>.
            </span>
            <button
                onClick={stopImpersonation}
                className="ml-4 flex items-center bg-black/20 hover:bg-black/40 text-white font-semibold py-1 px-3 rounded-full transition-colors"
            >
                <X className="w-4 h-4 mr-1" />
                Stop Impersonating
            </button>
        </div>
    );
};

export default ImpersonationBanner;