import { Link } from 'react-router-dom';

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0A1128] via-[#0A1128] to-purple-900/20 py-20 px-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <Link to="/" className="inline-flex items-center text-[#EC4899] hover:text-[#6B46C1] transition-colors mb-6">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Home
                    </Link>
                    <h1 className="text-5xl font-bold text-white mb-4">Terms of Service</h1>
                    <p className="text-gray-400">Last updated: January 29, 2026</p>
                </div>

                {/* Content */}
                <div className="prose prose-invert prose-purple max-w-none">
                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                        <p className="text-gray-300 leading-relaxed">
                            By accessing and using PoDM ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Platform.
                        </p>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">2. The Enclave Program</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            The Enclave is a limited founding creator program with the following terms:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                            <li>Limited to 50 founding creators</li>
                            <li>90% revenue share for creators (10% platform fee)</li>
                            <li>Lifetime rate guarantee for accepted members</li>
                            <li>PoDM reserves the right to review and approve/reject applications</li>
                            <li>Acceptance into The Enclave does not guarantee specific earnings or success</li>
                        </ul>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">3. Creator Responsibilities</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            As a creator on PoDM, you agree to:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                            <li>Provide accurate information during registration and verification</li>
                            <li>Comply with all applicable laws and regulations</li>
                            <li>Own or have rights to all content you upload</li>
                            <li>Not engage in fraudulent or deceptive practices</li>
                            <li>Maintain the confidentiality of your account credentials</li>
                        </ul>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">4. Content Ownership</h2>
                        <p className="text-gray-300 leading-relaxed">
                            You retain 100% ownership of all content you create and upload to PoDM. By uploading content, you grant PoDM a non-exclusive license to host, store, and distribute your content to your subscribers.
                        </p>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">5. Payments and Fees</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            Enclave members receive:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                            <li>90% of all subscription revenue</li>
                            <li>90% of all pay-per-view content sales</li>
                            <li>90% of all tips and custom content payments</li>
                            <li>Payouts processed within 7 business days</li>
                            <li>No hidden fees or charges</li>
                        </ul>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">6. Privacy and Data Protection</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We take your privacy seriously. Please review our <Link to="/privacy-policy" className="text-[#EC4899] hover:text-[#6B46C1] transition-colors">Privacy Policy</Link> to understand how we collect, use, and protect your personal information.
                        </p>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">7. Termination</h2>
                        <p className="text-gray-300 leading-relaxed">
                            Either party may terminate this agreement at any time. Upon termination, you will retain access to withdraw any remaining earnings, and you maintain 100% ownership of your content.
                        </p>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">8. Limitation of Liability</h2>
                        <p className="text-gray-300 leading-relaxed">
                            PoDM provides the platform "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.
                        </p>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8">
                        <h2 className="text-2xl font-bold text-white mb-4">9. Contact</h2>
                        <p className="text-gray-300 leading-relaxed">
                            For questions about these Terms of Service, please contact us at{' '}
                            <a href="mailto:legal@podm.app" className="text-[#EC4899] hover:text-[#6B46C1] transition-colors">
                                legal@podm.app
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
