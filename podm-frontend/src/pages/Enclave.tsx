import { useEffect, useState } from 'react';
import { Shield, DollarSign, Lock, Rocket, Check, X } from 'lucide-react';
import EnclaveHero from '../features/enclave/EnclaveHero';
import EnclaveValueProps from '../features/enclave/EnclaveValueProps';
import EnclaveComparison from '../features/enclave/EnclaveComparison';
import EnclaveBenefits from '../features/enclave/EnclaveBenefits';
import EnclaveFAQ from '../features/enclave/EnclaveFAQ';
import EnclaveApplicationForm from '../features/enclave/EnclaveApplicationForm';

export default function Enclave() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0A1128] via-[#0A1128] to-purple-900/20">
            {/* Hero Section */}
            <EnclaveHero />

            {/* Value Propositions */}
            <section className={`py-20 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                <EnclaveValueProps />
            </section>

            {/* Comparison Table */}
            <section className="py-20">
                <EnclaveComparison />
            </section>

            {/* Benefits */}
            <section className="py-20 bg-gradient-to-b from-transparent to-purple-900/10">
                <EnclaveBenefits />
            </section>

            {/* FAQ */}
            <section className="py-20">
                <EnclaveFAQ />
            </section>

            {/* Application Form */}
            <section className="py-20 bg-gradient-to-b from-purple-900/10 to-transparent">
                <EnclaveApplicationForm />
            </section>

            {/* Footer CTA */}
            <section className="py-16 text-center border-t border-gray-800">
                <div className="max-w-4xl mx-auto px-6">
                    <p className="text-gray-400 text-sm">
                        Questions? Email us at{' '}
                        <a href="mailto:enclave@podm.app" className="text-pink-400 hover:text-pink-300 transition-colors">
                            enclave@podm.app
                        </a>
                    </p>
                    <p className="text-gray-500 text-xs mt-4">
                        © 2026 PoDM. All rights reserved. | Privacy-first creator platform.
                    </p>
                </div>
            </section>
        </div>
    );
}
