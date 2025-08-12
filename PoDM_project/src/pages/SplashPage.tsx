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
                <main>
                    <Container className="py-20 text-center">
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                            Your Content. Your Rules. <br />
                            <span className="text-purple-500">Your Community.</span>
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-300">
                            The platform built for creators to connect with their fans on a deeper level, with better profit splits and powerful tools.
                        </p>
                        <div className="mt-8 flex justify-center space-x-4">
                            <button 
                                onClick={() => openModal('signup')} 
                                className="px-8 py-3 text-lg font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Get Started
                            </button>
                        </div>
                    </Container>
                </main>

                {/* Features Section */}
                <section className="py-20 bg-gray-800/50">
                    <Container>
                        <h2 className="text-3xl font-bold text-center mb-12">Why Choose PoDM?</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="text-center p-6">
                                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-purple-500/20 rounded-full mb-4">
                                    <Users className="w-8 h-8 text-purple-400" />
                                </div>
                                <h3 className="text-xl font-semibold">For the Fans</h3>
                                <p className="mt-2 text-gray-400">Directly support your favorite creators and get exclusive content you can't find anywhere else.</p>
                            </div>
                            <div className="text-center p-6">
                                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-pink-500/20 rounded-full mb-4">
                                    <Star className="w-8 h-8 text-pink-400" />
                                </div>
                                <h3 className="text-xl font-semibold">For the Creators</h3>
                                <p className="mt-2 text-gray-400">Enjoy industry-leading profit splits, robust content protection, and powerful analytics to grow your business.</p>
                            </div>
                             <div className="text-center p-6">
                                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-500/20 rounded-full mb-4">
                                    <Shield className="w-8 h-8 text-green-400" />
                                </div>
                                <h3 className="text-xl font-semibold">Safe & Secure</h3>
                                <p className="mt-2 text-gray-400">Our platform is built with privacy and security as a top priority for everyone.</p>
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
