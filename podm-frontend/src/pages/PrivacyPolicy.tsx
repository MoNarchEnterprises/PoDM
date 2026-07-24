import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
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
                    <h1 className="text-5xl font-bold text-white mb-4">Privacy Policy</h1>
                    <p className="text-gray-400">Last updated: January 29, 2026</p>
                </div>

                {/* Content */}
                <div className="prose prose-invert prose-purple max-w-none">
                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
                        <p className="text-gray-300 leading-relaxed">
                            At PoDM, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. We prioritize creator and fan privacy above all else.
                        </p>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            We collect information that you provide directly to us:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                            <li><strong>Account Information:</strong> Name, email address, username, password</li>
                            <li><strong>Profile Information:</strong> Bio, avatar, content preferences</li>
                            <li><strong>Payment Information:</strong> Processed via USDC on the Base blockchain (we do not store wallet private keys)</li>
                            <li><strong>Verification Documents:</strong> For creator verification (stored securely and encrypted)</li>
                            <li><strong>Content:</strong> Posts, messages, and media you upload</li>
                            <li><strong>Usage Data:</strong> Analytics about how you use the platform</li>
                        </ul>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            We use your information to:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                            <li>Provide, maintain, and improve our services</li>
                            <li>Process payments and transactions</li>
                            <li>Verify creator identities and prevent fraud</li>
                            <li>Send important notifications about your account</li>
                            <li>Respond to your requests and support inquiries</li>
                            <li>Analyze platform usage to improve user experience</li>
                            <li>Comply with legal obligations</li>
                        </ul>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">4. Privacy Commitment</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            PoDM is built on a foundation of privacy:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                            <li><strong>No Public Creator Lists:</strong> We never display public directories of creators</li>
                            <li><strong>Private by Default:</strong> Your profile is only visible to those you choose</li>
                            <li><strong>No Data Selling:</strong> We will never sell your personal information to third parties</li>
                            <li><strong>Encrypted Storage:</strong> Sensitive data is encrypted at rest and in transit</li>
                            <li><strong>Minimal Data Collection:</strong> We only collect what's necessary to operate the platform</li>
                        </ul>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">5. Information Sharing</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            We do not sell your personal information. We may share your information only in these limited circumstances:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                            <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
                            <li><strong>Service Providers:</strong> With trusted partners who help us operate (e.g., Cloudflare for storage, Coinbase for on-ramp services)</li>
                            <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
                            <li><strong>Business Transfers:</strong> In the event of a merger or acquisition (with notice to users)</li>
                        </ul>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">6. Data Security</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We implement industry-standard security measures to protect your information, including encryption, secure servers, and regular security audits. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                        </p>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">7. Your Rights</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            You have the right to:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                            <li>Access your personal information</li>
                            <li>Correct inaccurate information</li>
                            <li>Request deletion of your account and data</li>
                            <li>Export your data</li>
                            <li>Opt-out of marketing communications</li>
                            <li>Object to certain data processing activities</li>
                        </ul>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">8. Data Retention</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We retain your information for as long as your account is active or as needed to provide services. After account deletion, we may retain certain information for legal compliance, fraud prevention, and dispute resolution.
                        </p>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">9. Cookies and Tracking</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We use essential cookies to maintain your session and preferences. We do not use third-party advertising cookies or tracking pixels. You can control cookie preferences through your browser settings.
                        </p>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">10. Changes to This Policy</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
                        </p>
                    </div>

                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-8">
                        <h2 className="text-2xl font-bold text-white mb-4">11. Contact Us</h2>
                        <p className="text-gray-300 leading-relaxed">
                            If you have questions about this Privacy Policy or your personal information, please contact us at{' '}
                            <a href="mailto:privacy@podm.app" className="text-[#EC4899] hover:text-[#6B46C1] transition-colors">
                                privacy@podm.app
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
