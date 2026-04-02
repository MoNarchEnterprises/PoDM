import { useState, useEffect } from 'react';
import { Copy, Check, Share2, TrendingUp, DollarSign, Percent } from 'lucide-react';
import apiClient from '../../lib/apiClient';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

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
            <Card className="text-center">
                <Share2 className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Generate Your Referral Codes</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Get two unique referral codes to share with potential Enclave members and earn bonuses!
                </p>
                <Button
                    onClick={generateCodes}
                    isLoading={generating}
                    className="w-full bg-gradient-to-r from-[#6B46C1] to-[#EC4899] hover:from-[#553C9A] hover:to-[#D63384]"
                >
                    Generate Referral Codes
                </Button>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Referral Program</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Earn bonuses by referring creators to The Enclave</p>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">Total Uses</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalUses}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800/40 border border-green-200 dark:border-green-500/20 rounded-xl p-6 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">Total Earned</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">${stats.totalEarned.toFixed(2)}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800/40 border border-purple-200 dark:border-purple-500/20 rounded-xl p-6 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="w-5 h-5 text-purple-500" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">Cash Referrals</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.cashReferrals}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800/40 border border-pink-200 dark:border-pink-500/20 rounded-xl p-6 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-2">
                            <Percent className="w-5 h-5 text-pink-500" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">% Share Referrals</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.percentageReferrals}</div>
                    </div>
                </div>
            )}

            {/* Referral Codes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {referrals.map((referral) => (
                    <Card key={referral.id} className="relative overflow-hidden" noPadding>
                         <div className={`absolute top-0 left-0 w-1 h-full ${referral.bonus_type === 'cash' ? 'bg-green-500' : 'bg-pink-500'}`} />
                         
                         <div className="p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        {referral.bonus_type === 'cash' ? (
                                            <DollarSign className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <Percent className="w-4 h-4 text-pink-500" />
                                        )}
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            {referral.bonus_type === 'cash' ? 'Cash Bonus' : 'Revenue Share'}
                                        </h3>
                                    </div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {referral.bonus_type === 'cash'
                                            ? `$${referral.bonus_value} per referral`
                                            : `${referral.bonus_value}% revenue share`
                                        }
                                    </p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${referral.is_active
                                    ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-500/20 dark:text-gray-400'
                                    }`}>
                                    {referral.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {/* Link Display */}
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-100 dark:border-gray-800">
                                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 block">Referral Link</label>
                                    <div className="text-sm font-medium text-purple-600 dark:text-purple-400 break-all line-clamp-1">{getReferralLink(referral.referral_code)}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Uses</div>
                                        <div className="text-lg font-bold text-gray-900 dark:text-white">{referral.uses_count}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Code</div>
                                        <div className="text-lg font-mono font-bold text-gray-900 dark:text-white">{referral.referral_code}</div>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => copyToClipboard(referral.referral_code)}
                                    size="sm"
                                    className="w-full h-9 text-xs font-semibold flex items-center justify-center gap-2"
                                >
                                    {copiedCode === referral.referral_code ? (
                                        <>
                                            <Check className="w-3.5 h-3.5" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" />
                                            Copy Link
                                        </>
                                    )}
                                </Button>
                            </div>
                         </div>
                    </Card>
                ))}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-xl p-6">
                <h3 className="text-base font-semibold text-blue-900 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <Share2 className="w-5 h-5" />
                    How It Works
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-blue-800 dark:text-gray-400">
                    <li className="flex items-start gap-3">
                        <div className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                        <span><strong>Cash Bonus:</strong> Earn ${referrals.find(r => r.bonus_type === 'cash')?.bonus_value || 50} when your referral earns $750 in their first month (+ $25 speed bonus if within 2 weeks).</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <div className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                        <span><strong>Revenue Share:</strong> Earn {referrals.find(r => r.bonus_type === 'percentage')?.bonus_value || 1}% of your referral's earnings for their first 6 months.</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <div className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                        <span>Share the link with potential creators - the referral code will be automatically filled in their application.</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <div className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                        <span>Track your earnings and referral success in real-time right here on your dashboard.</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
