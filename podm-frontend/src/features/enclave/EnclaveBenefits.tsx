export default function EnclaveBenefits() {
    const benefits = [
        {
            category: 'Lifetime Economics',
            items: [
                '90/10 revenue split (you keep 90%)',
                'Tiered structure as you grow:',
                '  • $0-5k/month: 10% fee',
                '  • $5k-10k/month: 10% fee',
                '  • $10k+/month: 10% fee',
                'No hidden fees, no surprises'
            ]
        },
        {
            category: 'Premium Tools',
            items: [
                'Fan contests & engagement features',
                'Advanced analytics dashboard',
                'Subscription tiers with custom benefits',
                'PPV content monetization',
                'Mass messaging tools',
                'Content scheduling'
            ]
        },
        {
            category: 'White-Glove Service',
            items: [
                'Personal onboarding call',
                'Content migration assistance',
                'Launch strategy support',
                'Ongoing priority support'
            ]
        },
        {
            category: 'The Enclave Community',
            items: [
                'Private Discord channel',
                'Network with fellow founding creators',
                'Direct access to dev team',
                'Weekly Q&A sessions',
                'Vote on new features'
            ]
        }
    ];

    return (
        <div className="max-w-6xl mx-auto px-6">
            {/* Section header */}
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    What You Get
                </h2>
                <p className="text-xl text-gray-400">
                    Exclusive benefits for Enclave members
                </p>
            </div>

            {/* Benefits grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {benefits.map((benefit, index) => (
                    <div
                        key={index}
                        className="p-8 rounded-2xl bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 hover:border-[#6B46C1]/50 transition-all duration-300"
                    >
                        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-[#EC4899]">●</span>
                            {benefit.category}
                        </h3>
                        <ul className="space-y-2">
                            {benefit.items.map((item, i) => (
                                <li key={i} className="text-gray-300 flex items-start gap-2">
                                    {item.startsWith('  •') ? (
                                        <span className="ml-4">{item}</span>
                                    ) : (
                                        <>
                                            <span className="text-[#6B46C1] mt-1">✓</span>
                                            <span>{item}</span>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Trust signals */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 rounded-xl bg-gray-900/40 border border-gray-800">
                    <div className="text-3xl font-bold text-[#EC4899] mb-2">$0</div>
                    <div className="text-sm text-gray-400">Setup Fees</div>
                </div>
                <div className="text-center p-6 rounded-xl bg-gray-900/40 border border-gray-800">
                    <div className="text-3xl font-bold text-[#EC4899] mb-2">$0</div>
                    <div className="text-sm text-gray-400">Monthly Platform Fees</div>
                </div>
                <div className="text-center p-6 rounded-xl bg-gray-900/40 border border-gray-800">
                    <div className="text-3xl font-bold text-[#EC4899] mb-2">100%</div>
                    <div className="text-sm text-gray-400">You Own Your Content</div>
                </div>
            </div>
        </div>
    );
}
