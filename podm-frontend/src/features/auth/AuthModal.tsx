import React, { useState, useEffect } from 'react';
import { X, Mail, KeyRound, User as UserIcon } from 'lucide-react';

// --- Import Shared Types ---
import { UserRole } from '@common/types/User';

// --- Import Reusable UI Components & Hooks ---
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'signup';
}

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) => {
    const [mode, setMode] = useState(initialMode);
    const [userType, setUserType] = useState<UserRole>('fan');
    
    // Form state
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { login, signup } = useAuth(); // Get auth functions from the hook

    // Reset the mode when the modal is reopened with a different initial mode
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setError(''); // Clear previous errors when modal opens
        }
    }, [initialMode, isOpen]);

    const handleClose = () => {
        // Reset internal state before closing
        setUserType('fan');
        setUsername('');
        setEmail('');
        setPassword('');
        setError('');
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (mode === 'login') {
                await login(email, password);
            } else {
                // Pass the userType to the signup function
                await signup(username, email, password, userType); 
            }
            handleClose(); // Close modal on success
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            <div className="p-8">
                <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                    {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
                </h2>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {mode === 'login' ? 'Log in to continue your journey.' : 'Join the community of creators and fans.'}
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    {mode === 'signup' && (
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">I am a...</label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button type="button" variant={userType === 'fan' ? 'primary' : 'secondary'} onClick={() => setUserType('fan')}>Fan</Button>
                                <Button type="button" variant={userType === 'creator' ? 'primary' : 'secondary'} onClick={() => setUserType('creator')}>Creator</Button>
                            </div>
                        </div>
                    )}
                    
                    {mode === 'signup' && (
                        <Input id="username" type="text" placeholder="Username" leftIcon={UserIcon} value={username} onChange={e => setUsername(e.target.value)} required disabled={isLoading} />
                    )}

                    <Input id="email" type="email" placeholder="Email Address" leftIcon={Mail} value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoading} />
                    <Input id="password" type="password" placeholder="Password" leftIcon={KeyRound} value={password} onChange={e => setPassword(e.target.value)} required disabled={isLoading} />

                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                    <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                        {mode === 'login' ? 'Log In' : 'Sign Up'}
                    </Button>

                    <div className="text-center text-sm">
                        {mode === 'login' ? (
                            <p className="text-gray-500 dark:text-gray-400">
                                Don't have an account? <button type="button" onClick={() => setMode('signup')} className="font-medium text-purple-600 dark:text-purple-400 hover:underline">Sign Up</button>
                            </p>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400">
                                Already have an account? <button type="button" onClick={() => setMode('login')} className="font-medium text-purple-600 dark:text-purple-400 hover:underline">Log In</button>
                            </p>
                        )}
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default AuthModal;
