// src/pages/ResetPasswordPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabaseClient'; // We need the frontend client here
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { KeyRound, CheckCircle } from 'lucide-react';

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // This effect handles the Supabase session from the URL hash
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                // This event fires when the user lands on this page from the email link.
                // The Supabase client library automatically handles the token in the URL.
                // The user is now in a temporary authenticated state.
                console.log('Password recovery session established.');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // The user is already authenticated via the link, so we can update their password.
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (updateError) {
            setError(updateError.message);
        } else {
            setSuccess(true);
            // Sign the user out of the temporary session before they log in again.
            await supabase.auth.signOut();
            setTimeout(() => {
                navigate('/'); // Navigate to splash page to open login modal
            }, 3000); // Wait 3 seconds before redirecting
        }

        setIsLoading(false);
    };

    if (success) {
        return (
            <AuthLayout>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h1 className="text-2xl font-bold">Password Updated!</h1>
                    <p className="text-gray-500 mt-2">Your password has been successfully changed. Redirecting you to the login page...</p>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <div className="w-full max-w-md mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                    <h1 className="text-2xl font-bold text-center">Set a New Password</h1>
                    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                        <Input
                            id="new-password"
                            type="password"
                            label="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            leftIcon={KeyRound}
                            required
                            disabled={isLoading}
                        />
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                            Save New Password
                        </Button>
                    </form>
                </div>
            </div>
        </AuthLayout>
    );
};

export default ResetPasswordPage;