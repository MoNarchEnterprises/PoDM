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
                        <div className="absolute top-20 left-10 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                        <div className="absolute top-20 right-10 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                        <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
                    </div>

                    <Container className="relative z-10 py-16 md:py-24 lg:py-32">
                        <div className="flex flex-col lg:flex-row items-center gap-12 text-center lg:text-left">
                            <div className="flex-1 space-y-8">
                                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
                                    Stop Chasing Likes. <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                                        Start Monetizing Connection.
                                    </span>
                                </h1>
                                <p className="text-lg sm:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                                    The only platform where follower counts don't exist. No algorithms, no public metrics, just a private link for your top fans to support you. Your numbers are nobody's business but yours.
                                </p>
                                <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                                    <button
                                        onClick={() => openModal('signup')}
                                        className="px-8 py-4 text-lg font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-purple-500/25 ring-2 ring-purple-500/50"
                                    >
                                        Claim Your Private Link
                                    </button>
                                    <button
                                        onClick={() => openModal('login')}
                                        className="px-8 py-4 text-lg font-bold text-gray-300 bg-gray-800 rounded-xl hover:bg-gray-700 transition-all transform hover:scale-105 border border-gray-700"
                                    >
                                        Log In
                                    </button>
                                </div>
                            </div>

                            {/* Visual Proof - Split Screen Image */}
                            <div className="flex-1 w-full max-w-lg lg:max-w-xl mx-auto lg:mx-0">
                                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-700/50 bg-gray-900/50 backdrop-blur-xl group hover:scale-[1.02] transition-transform duration-500">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <img
                                        src="/assets/creator_dashboard_proof_1767705965542.png"
                                        alt="PoDM Creator Dashboard showing earning notifications"
                                        className="w-full h-auto object-cover relative z-10"
                                    />
                                    {/* Floating Badge */}
                                    <div className="absolute top-6 left-6 z-20 bg-gray-900/90 backdrop-blur-md border border-purple-500/30 px-4 py-2 rounded-full flex items-center gap-2 shadow-xl">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-xs font-bold text-gray-200">Live Earnings</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Container>
                </main>

                {/* Features Section - The Killer Features */}
                <section className="py-20 bg-gray-900 border-t border-gray-800">
                    <Container>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                            {/* Card 1: High-Ticket DMs */}
                            <div className="relative p-8 rounded-3xl bg-gray-800/40 border border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-2 group">
                                <div className="absolute -inset-px bg-gradient-to-b from-purple-500/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10">
                                    <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mb-6 border border-gray-700 group-hover:border-purple-500/50 transition-colors">
                                        <span className="text-2xl">💬</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3">High-Ticket DMs</h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        Turn DMs into a storefront. Set prices for PPV media. Filter your inbox by who pays, not who spams.
                                    </p>
                                </div>
                            </div>

                            {/* Card 2: The Anti-Algorithm */}
                            <div className="relative p-8 rounded-3xl bg-gray-800/40 border border-gray-700 hover:border-pink-500/50 transition-all duration-300 hover:-translate-y-2 group">
                                <div className="absolute -inset-px bg-gradient-to-b from-pink-500/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10">
                                    <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mb-6 border border-gray-700 group-hover:border-pink-500/50 transition-colors">
                                        <div className="relative">
                                            <span className="text-2xl">👁️</span>
                                            <div className="absolute inset-0 flex items-center justify-center text-red-500 font-bold text-3xl rotate-45 transform translate-y-[-2px]">/</div>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3">The Anti-Algorithm</h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        Zero Public Metrics. No follower counts. No public 'view' counters. Your profile is your private club, not a popularity contest.
                                    </p>
                                </div>
                            </div>

                            {/* Card 3: The Velvet Rope */}
                            <div className="relative p-8 rounded-3xl bg-gray-800/40 border border-gray-700 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2 group">
                                <div className="absolute -inset-px bg-gradient-to-b from-blue-500/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10">
                                    <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mb-6 border border-gray-700 group-hover:border-blue-500/50 transition-colors">
                                        <span className="text-2xl">🔐</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3">The Velvet Rope</h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        Invite-Only Access. Your profile is invisible until you share your link. Total control over who sees your content.
                                    </p>
                                </div>
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
