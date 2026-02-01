import { useState, useEffect } from 'react';
import { Copy, Check, Share2, TrendingUp, DollarSign, Percent } from 'lucide-react';
import apiClient from '../../lib/apiClient';
import Button from '../../components/ui/Button';

interface Referral {
    id: string;
    referral_code: string;
    bonus_type: 'cash' | 'percentage';
    bonus_value: number;
    uses_count: number;
    total_bonus_earned: number;
    is_active: boolean;
}

interface ReferralStats {
    totalUses: number;
    totalEarned: number;
    cashReferrals: number;
    percentageReferrals: number;
}

export default function ReferralCodes() {
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchReferralData();
    }, []);

    const fetchReferralData = async () => {
        try {
            setLoading(true);
            const [codesRes, statsRes] = await Promise.all([
                apiClient.get('/referrals/my-codes'),
                apiClient.get('/referrals/stats')
            ]);
            setReferrals(codesRes.data.referrals || []);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error fetching referral data:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateCodes = async () => {
        try {
            setGenerating(true);
            await apiClient.post('/referrals/generate');
            await fetchReferralData();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to generate referral codes');
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = (code: string) => {
        const referralLink = `${window.location.origin}/enclave?ref=${code}`;
        navigator.clipboard.writeText(referralLink);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const getReferralLink = (code: string) => {
        return `${window.location.origin}/enclave?ref=${code}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading referral codes...</div>
            </div>
        );
    }

    if (referrals.length === 0) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-xl p-8 text-center">
                    <Share2 className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                    <h2 className="text-2xl font-bold text-white mb-2">Generate Your Referral Codes</h2>
                    <p className="text-gray-400 mb-6">
                        Get two unique referral codes to share with potential Enclave members and earn bonuses!
                    </p>
                    <Button
                        onClick={generateCodes}
                        isLoading={generating}
                        className="bg-gradient-to-r from-[#6B46C1] to-[#EC4899] hover:from-[#553C9A] hover:to-[#D63384]"
                    >
                        Generate Referral Codes
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Referral Program</h1>
                <p className="text-gray-400">Share your referral links and earn bonuses when creators join The Enclave</p>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                            <span className="text-sm text-gray-400">Total Uses</span>
                        </div>
                        <div className="text-3xl font-bold text-white">{stats.totalUses}</div>
                    </div>
                    <div className="bg-gray-900/40 backdrop-blur-lg border border-green-500/50 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="w-5 h-5 text-green-400" />
                            <span className="text-sm text-gray-400">Total Earned</span>
                        </div>
                        <div className="text-3xl font-bold text-white">${stats.totalEarned.toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-900/40 backdrop-blur-lg border border-purple-500/50 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="w-5 h-5 text-purple-400" />
                            <span className="text-sm text-gray-400">Cash Referrals</span>
                        </div>
                        <div className="text-3xl font-bold text-white">{stats.cashReferrals}</div>
                    </div>
                    <div className="bg-gray-900/40 backdrop-blur-lg border border-pink-500/50 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Percent className="w-5 h-5 text-pink-400" />
                            <span className="text-sm text-gray-400">% Share Referrals</span>
                        </div>
                        <div className="text-3xl font-bold text-white">{stats.percentageReferrals}</div>
                    </div>
                </div>
            )}

            {/* Referral Codes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {referrals.map((referral) => (
                    <div
                        key={referral.id}
                        className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 backdrop-blur-lg border border-gray-700/50 rounded-xl p-6"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    {referral.bonus_type === 'cash' ? (
                                        <DollarSign className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <Percent className="w-5 h-5 text-pink-400" />
                                    )}
                                    <h3 className="text-lg font-semibold text-white">
                                        {referral.bonus_type === 'cash' ? 'Cash Bonus' : 'Revenue Share'}
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-400">
                                    {referral.bonus_type === 'cash'
                                        ? `$${referral.bonus_value} per referral`
                                        : `${referral.bonus_value}% revenue share`
                                    }
                                </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${referral.is_active
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                                }`}>
                                {referral.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        {/* Code Display */}
                        <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                            <label className="text-xs text-gray-400 mb-2 block">Referral Code</label>
                            <div className="font-mono text-lg text-white break-all">{referral.referral_code}</div>
                        </div>

                        {/* Link Display */}
                        <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                            <label className="text-xs text-gray-400 mb-2 block">Referral Link</label>
                            <div className="text-sm text-purple-400 break-all">{getReferralLink(referral.referral_code)}</div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <div className="text-xs text-gray-400">Uses</div>
                                <div className="text-xl font-bold text-white">{referral.uses_count}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-400">Earned</div>
                                <div className="text-xl font-bold text-white">${referral.total_bonus_earned.toFixed(2)}</div>
                            </div>
                        </div>

                        {/* Copy Button */}
                        <button
                            onClick={() => copyToClipboard(referral.referral_code)}
                            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {copiedCode === referral.referral_code ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copy Link
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">How It Works</h3>
                <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span><strong>Cash Bonus:</strong> Earn ${referrals.find(r => r.bonus_type === 'cash')?.bonus_value || 50} when your referral earns $750 in their first month (+ $25 speed bonus if within 2 weeks)</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span><strong>Revenue Share:</strong> Earn {referrals.find(r => r.bonus_type === 'percentage')?.bonus_value || 1}% of your referral's earnings for their first 6 months</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>Share the link with potential creators - the referral code will be automatically filled in their application</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
