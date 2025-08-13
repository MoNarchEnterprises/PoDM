import React, { useState } from 'react';
import { Shield, Mail, KeyRound, LogIn } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import AuthLayout from '../components/layout/AuthLayout';

// --- Main Admin Login Page Component ---
const AdminLoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        
        // In a real application, you would call your authentication logic here.
        // This could be a function from your useAuth hook, for example:
        // const { error } = await auth.login(email, password, { isAdmin: true });
        console.log("Attempting admin login with:", { email, password });
        
        // Simulate an API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Example error handling
        if (email !== 'admin@podm.com' || password !== 'password') {
            setError('Invalid credentials. Please try again.');
        } else {
            // On a successful login, you would typically redirect the user
            // to the main admin dashboard.
            alert('Login successful! Redirecting to /admin/dashboard...');
            // window.location.href = '/admin/dashboard';
        }

        setIsLoading(false);
    };

    return (
        <AuthLayout>
            <div className="w-full max-w-md mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <Shield className="w-12 h-12 mx-auto text-purple-500" />
                        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Admin Portal</h1>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            id="email"
                            type="email"
                            label="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            leftIcon={Mail}
                            required
                            disabled={isLoading}
                        />
                         <Input
                            id="password"
                            type="password"
                            label="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            leftIcon={KeyRound}
                            required
                            disabled={isLoading}
                        />
                        
                        <div className="text-right text-sm">
                            <a href="#" className="font-medium text-purple-600 dark:text-purple-400 hover:underline">
                                Forgot password?
                            </a>
                        </div>

                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                        <Button 
                            type="submit" 
                            className="w-full"
                            size="lg"
                            isLoading={isLoading}
                            leftIcon={LogIn}
                        >
                            Sign In
                        </Button>
                    </form>
                </div>
            </div>
        </AuthLayout>
    );
};

export default AdminLoginPage;
