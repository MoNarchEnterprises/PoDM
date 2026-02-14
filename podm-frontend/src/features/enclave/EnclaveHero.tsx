import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../lib/apiClient';

export default function EnclaveHero() {
    const [spotsRemaining, setSpotsRemaining] = useState<number | null>(null);

    useEffect(() => {
        // Fetch spots remaining from API using apiClient (which uses VITE_API_URL)
        apiClient.get('/enclave/spots-remaining')
            .then(res => setSpotsRemaining(res.data.spotsRemaining))
            .catch((error) => {
                console.error('Failed to fetch spots remaining:', error);
                setSpotsRemaining(null); // Show loading state instead of misleading fallback
            });
    }, []);

    const scrollToForm = () => {
        document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A1128] via-purple-900/20 to-pink-900/10" />

            {/* Velvet rope decorations */}
            <div className="absolute top-20 left-10 w-1 h-64 bg-gradient-to-b from-transparent via-[#6B46C1] to-transparent opacity-30 transform -rotate-12" />
            <div className="absolute top-20 right-10 w-1 h-64 bg-gradient-to-b from-transparent via-[#6B46C1] to-transparent opacity-30 transform rotate-12" />

            {/* Logo */}
            <Link to="/" className="absolute top-8 left-8 z-10">
                <img src="/assets/PoDM-logo.png" alt="PoDM" className="h-12 w-auto" />
            </Link>

            {/* Main content */}
            <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                {/* Headline */}
                <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 tracking-tight">
                    Join The Enclave
                </h1>

                {/* Subheadline */}
                <p className="text-xl md:text-2xl text-gray-300 mb-4">
                    Elite creators. Premium tools. Complete privacy.
                </p>

                {/* Description */}
                <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
                    Only 50 founding creators will shape the future of PoDM.
                    <br />
                    Keep 90% of your earnings. Forever.
                </p>

                {/* Spots counter */}
                <div className="inline-block mb-10 px-8 py-4 rounded-2xl bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-lg border border-gray-700/50">
                    <div className="flex items-center gap-3">
                        <span className="text-5xl font-bold text-[#F59E0B]">
                            {spotsRemaining ?? '...'}
                        </span>
                        <div className="text-left">
                            <div className="text-sm text-gray-400">of 50 Spots</div>
                            <div className="text-lg font-semibold text-white">Remaining</div>
                        </div>
                    </div>
                </div>

                {/* CTA Button */}
                <button
                    onClick={scrollToForm}
                    className="group relative inline-flex items-center gap-2 px-12 py-4 text-lg font-bold text-white bg-[#6B46C1] rounded-full hover:bg-[#553C9A] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]"
                >
                    Apply for The Enclave
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </button>

                {/* Trust signal */}
                <p className="mt-8 text-sm text-gray-500">
                    No setup fees. No commitments. Just opportunity.
                </p>
            </div>

            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0A1128] to-transparent" />
        </div>
    );
}
