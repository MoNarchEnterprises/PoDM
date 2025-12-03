import React, { useState } from 'react';
import { Shield, Star, Users } from 'lucide-react';

// --- Import Reusable Components ---
// Note: You will need to create these components in the specified directories.
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Container from '../components/layout/Container';
import AuthModal from '../features/auth/AuthModal'; // This is a new component we need to create.

// --- Main Splash Page Component ---
const SplashPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'login' | 'signup'>('login');

    const openModal = (mode: 'login' | 'signup') => {
        setModalMode(mode);
        setIsModalOpen(true);
    };

    return (
        <>
            {/* The AuthModal is rendered here but is only visible when isModalOpen is true */}
            <AuthModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialMode={modalMode}
            />

            <div className="bg-gray-900 text-white font-sans">
                <Header
                    onLoginClick={() => openModal('login')}
                    onSignUpClick={() => openModal('signup')}
                />

                {/* Hero Section */}
                <main className="relative overflow-hidden">
                    {/* Background Gradient Blob */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-30 pointer-events-none">
                        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                        <div className="absolute top-20 right-10 w-72 h-72 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
                    </div>

                    <Container className="relative z-10 py-16 md:py-24 lg:py-32 text-center">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
                            Your Content. Your Rules. <br className="hidden sm:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                                Your Community.
                            </span>
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed">
                            The platform built for creators to connect with their fans on a deeper level, with better profit splits and powerful tools.
                        </p>
                        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row justify-center gap-4 sm:space-x-4">
                            <button
                                onClick={() => openModal('signup')}
                                className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
                            >
                                Get Started
                            </button>
                            <button
                                onClick={() => openModal('login')}
                                className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-gray-300 bg-gray-800 rounded-xl hover:bg-gray-700 transition-all transform hover:scale-105 border border-gray-700"
                            >
                                Log In
                            </button>
                        </div>
                    </Container>
                </main>

                {/* Features Section */}
                <section className="py-16 md:py-24 bg-gray-800/30 backdrop-blur-sm">
                    <Container>
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16">
                            Why Choose <span className="text-purple-500">PoDM</span>?
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                            <div className="text-center p-8 rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:shadow-purple-500/10">
                                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-purple-500/20 rounded-2xl mb-6 rotate-3 hover:rotate-6 transition-transform">
                                    <Users className="w-8 h-8 text-purple-400" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">For the Fans</h3>
                                <p className="text-gray-400 leading-relaxed">Directly support your favorite creators and get exclusive content you can't find anywhere else.</p>
                            </div>
                            <div className="text-center p-8 rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:border-pink-500/30 transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:shadow-pink-500/10">
                                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-pink-500/20 rounded-2xl mb-6 -rotate-3 hover:-rotate-6 transition-transform">
                                    <Star className="w-8 h-8 text-pink-400" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">For the Creators</h3>
                                <p className="text-gray-400 leading-relaxed">Enjoy industry-leading profit splits, robust content protection, and powerful analytics to grow your business.</p>
                            </div>
                            <div className="text-center p-8 rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:border-green-500/30 transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-xl hover:shadow-green-500/10">
                                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-500/20 rounded-2xl mb-6 rotate-3 hover:rotate-6 transition-transform">
                                    <Shield className="w-8 h-8 text-green-400" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Safe & Secure</h3>
                                <p className="text-gray-400 leading-relaxed">Our platform is built with privacy and security as a top priority for everyone.</p>
                            </div>
                        </div>
                    </Container>
                </section>

                <Footer />
            </div>
        </>
    );
};

export default SplashPage;
