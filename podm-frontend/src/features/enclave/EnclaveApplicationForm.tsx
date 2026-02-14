import { useState, FormEvent, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader } from 'lucide-react';
import Button from '../../components/ui/Button';
import apiClient from '../../lib/apiClient';

interface FormData {
    fullName: string;
    email: string;
    phone: string;
    currentPlatform: string[];
    followerCount: string;
    monthlyEarnings: string;
    contentType: string[];
    whyJoin: string;
    howHeard: string;
    referralCode: string;
    agreeTerms: boolean;
    agreeEnclave: boolean;
}

export default function EnclaveApplicationForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [referralCodeFromUrl, setReferralCodeFromUrl] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        fullName: '',
        email: '',
        phone: '',
        currentPlatform: [],
        followerCount: '',
        monthlyEarnings: '',
        contentType: [],
        whyJoin: '',
        howHeard: '',
        referralCode: '',
        agreeTerms: false,
        agreeEnclave: false
    });

    // Check for referral code in URL on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');

        if (refCode) {
            setFormData(prev => ({
                ...prev,
                referralCode: refCode.toUpperCase()
            }));
            setReferralCodeFromUrl(true);
        }
    }, []);

    const handleCheckboxChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            contentType: prev.contentType.includes(value)
                ? prev.contentType.filter(t => t !== value)
                : [...prev.contentType, value]
        }));
    };

    const handlePlatformChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            currentPlatform: prev.currentPlatform.includes(value)
                ? prev.currentPlatform.filter(p => p !== value)
                : [...prev.currentPlatform, value]
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.agreeTerms || !formData.agreeEnclave) {
            setError('Please agree to the terms to continue');
            return;
        }

        if (formData.whyJoin.length > 1000) {
            setError('Why join response must be under 1000 characters');
            return;
        }

        setIsSubmitting(true);

        try {
            // Only send fields that the backend expects (exclude agreeTerms and agreeEnclave)
            const applicationData = {
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                currentPlatform: formData.currentPlatform,
                followerCount: formData.followerCount,
                monthlyEarnings: formData.monthlyEarnings,
                contentType: formData.contentType,
                whyJoin: formData.whyJoin,
                howHeard: formData.howHeard,
                referralCode: formData.referralCode
            };

            // Use apiClient which properly uses VITE_API_URL in production
            await apiClient.post('/enclave/applications', applicationData);

            setSubmitted(true);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div id="application-form" className="max-w-2xl mx-auto px-6 text-center">
                <div className="p-12 rounded-2xl bg-gradient-to-br from-[#6B46C1]/20 to-[#EC4899]/20 backdrop-blur-lg border border-[#6B46C1]/50">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#6B46C1] to-[#EC4899] flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">
                        Application Received!
                    </h3>
                    <p className="text-lg text-gray-300 mb-6">
                        Thank you for applying to The Enclave. We'll review your application and get back to you within 24 hours.
                    </p>
                    <p className="text-sm text-gray-400">
                        Check your email ({formData.email}) for confirmation.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div id="application-form" className="max-w-3xl mx-auto px-6">
            {/* Section header */}
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    Apply to The Enclave
                </h2>
                <p className="text-xl text-gray-400">
                    Join our exclusive community of founding creators
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-gray-900/40 backdrop-blur-lg border border-gray-700/50">
                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400">
                        {error}
                    </div>
                )}

                {/* Basic Information */}
                <div className="mb-8">
                    <h3 className="text-xl font-bold text-white mb-4">Basic Information</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6B46C1] focus:border-transparent"
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6B46C1] focus:border-transparent"
                                    placeholder="your@email.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Phone Number (optional)
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6B46C1] focus:border-transparent"
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Platform & Audience */}
                <div className="mb-8">
                    <h3 className="text-xl font-bold text-white mb-4">Platform & Audience</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Current Platform(s) * (select all that apply)
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {['OnlyFans', 'Fansly', 'Instagram', 'TikTok', 'Twitter/X', 'YouTube', 'Other', 'New to content creation'].map((platform) => (
                                    <label key={platform} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.currentPlatform.includes(platform)}
                                            onChange={() => handlePlatformChange(platform)}
                                            className="w-5 h-5 rounded border-gray-700 text-[#6B46C1] focus:ring-[#6B46C1] focus:ring-offset-gray-900"
                                        />
                                        <span className="text-gray-300">{platform}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Follower/Subscriber Count *
                            </label>
                            <select
                                required
                                value={formData.followerCount}
                                onChange={(e) => setFormData({ ...formData, followerCount: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#6B46C1] focus:border-transparent"
                            >
                                <option value="">Select range...</option>
                                <option value="0-1000">0 - 1,000</option>
                                <option value="1000-10000">1,000 - 10,000</option>
                                <option value="10000-50000">10,000 - 50,000</option>
                                <option value="50000-100000">50,000 - 100,000</option>
                                <option value="100000+">100,000+</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Monthly Earnings (optional)
                            </label>
                            <select
                                value={formData.monthlyEarnings}
                                onChange={(e) => setFormData({ ...formData, monthlyEarnings: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#6B46C1] focus:border-transparent"
                            >
                                <option value="">Prefer not to say</option>
                                <option value="0-500">$0 - $500</option>
                                <option value="500-2000">$500 - $2,000</option>
                                <option value="2000-5000">$2,000 - $5,000</option>
                                <option value="5000-10000">$5,000 - $10,000</option>
                                <option value="10000+">$10,000+</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Content Type */}
                <div className="mb-8">
                    <h3 className="text-xl font-bold text-white mb-4">Content Type *</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {['Adult/NSFW', 'AI-generated', 'Fitness/Wellness', 'Lifestyle', 'Gaming', 'Other'].map((type) => (
                            <label key={type} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.contentType.includes(type)}
                                    onChange={() => handleCheckboxChange(type)}
                                    className="w-5 h-5 rounded border-gray-700 text-[#6B46C1] focus:ring-[#6B46C1] focus:ring-offset-gray-900"
                                />
                                <span className="text-gray-300">{type}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Why Join */}
                <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Why do you want to join The Enclave? * (max 1000 characters)
                    </label>
                    <textarea
                        required
                        rows={6}
                        maxLength={1000}
                        value={formData.whyJoin}
                        onChange={(e) => setFormData({ ...formData, whyJoin: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6B46C1] focus:border-transparent resize-none"
                        placeholder="Tell us about yourself, your goals, and what you hope to achieve with PoDM..."
                    />
                    <div className="text-right text-sm text-gray-500 mt-1">
                        {formData.whyJoin.length} / 1000
                    </div>
                </div>

                {/* How Heard & Referral */}
                <div className="mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                How did you hear about us? *
                            </label>
                            <select
                                required
                                value={formData.howHeard}
                                onChange={(e) => setFormData({ ...formData, howHeard: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-[#6B46C1] focus:border-transparent"
                            >
                                <option value="">Select...</option>
                                <option value="Instagram">Instagram</option>
                                <option value="Twitter/X">Twitter/X</option>
                                <option value="Reddit">Reddit</option>
                                <option value="Direct outreach">Direct outreach</option>
                                <option value="Friend/Referral">Friend/Referral</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Referral Code (optional)
                                {referralCodeFromUrl && (
                                    <span className="ml-2 text-xs text-purple-400">(Pre-filled from referral link)</span>
                                )}
                            </label>
                            <input
                                type="text"
                                value={formData.referralCode}
                                onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
                                disabled={referralCodeFromUrl}
                                className={`w-full px-4 py-3 rounded-lg border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6B46C1] focus:border-transparent ${referralCodeFromUrl
                                    ? 'bg-gray-700/50 border-purple-500/50 cursor-not-allowed'
                                    : 'bg-gray-800/50 border-gray-700'
                                    }`}
                                placeholder="Enter code"
                            />
                        </div>
                    </div>
                </div>

                {/* Terms */}
                <div className="mb-8 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            required
                            checked={formData.agreeTerms}
                            onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                            className="w-5 h-5 mt-0.5 rounded border-gray-700 text-[#6B46C1] focus:ring-[#6B46C1] focus:ring-offset-gray-900"
                        />
                        <span className="text-sm text-gray-300">
                            I agree to PoDM's{' '}
                            <Link to="/terms-of-service" target="_blank" className="text-[#EC4899] hover:text-[#6B46C1] underline transition-colors">
                                Terms of Service
                            </Link>
                            {' '}and{' '}
                            <Link to="/privacy-policy" target="_blank" className="text-[#EC4899] hover:text-[#6B46C1] underline transition-colors">
                                Privacy Policy
                            </Link>
                            {' '}*
                        </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            required
                            checked={formData.agreeEnclave}
                            onChange={(e) => setFormData({ ...formData, agreeEnclave: e.target.checked })}
                            className="w-5 h-5 mt-0.5 rounded border-gray-700 text-[#6B46C1] focus:ring-[#6B46C1] focus:ring-offset-gray-900"
                        />
                        <span className="text-sm text-gray-300">
                            I understand The Enclave is limited to 50 creators *
                        </span>
                    </label>
                </div>

                {/* Submit Button */}
                <Button
                    type="submit"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-[#6B46C1] to-[#EC4899] hover:from-[#553C9A] hover:to-[#D63384] text-white font-bold py-4 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]"
                >
                    {isSubmitting ? (
                        <>
                            <Loader className="w-5 h-5 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            Submit Application
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
