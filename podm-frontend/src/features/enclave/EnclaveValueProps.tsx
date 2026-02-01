import { DollarSign, Lock, Rocket } from 'lucide-react';

export default function EnclaveValueProps() {
    const valueProps = [
        {
            icon: DollarSign,
            title: 'Better Economics',
            points: [
                'Keep 90% of your earnings (vs 80% on OnlyFans)',
                'Lifetime Enclave rate - never increases',
                'Tiered fees reward your growth',
                'Transparent, no hidden costs'
            ],
            gradient: 'from-purple-500/20 to-pink-500/20'
        },
        {
            icon: Lock,
            title: 'Complete Privacy',
            points: [
                'Advanced content protection & watermarking',
                'Your data stays yours',
                'Velvet rope platform - discretion guaranteed',
                'No public creator directories'
            ],
            gradient: 'from-pink-500/20 to-purple-500/20'
        },
        {
            icon: Rocket,
            title: 'Founding Member Benefits',
            points: [
                'Exclusive Enclave badge',
                'Priority support from PoDM dev team',
                'Shape platform features',
                'Early access to new tools',
                'Private Enclave community'
            ],
            gradient: 'from-purple-500/20 to-blue-500/20'
        }
    ];

    return (
        <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {valueProps.map((prop, index) => (
                    <div
                        key={index}
                        className="group relative p-8 rounded-2xl bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 hover:border-[#6B46C1]/50 transition-all duration-300 hover:-translate-y-2"
                    >
                        {/* Gradient overlay on hover */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${prop.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                        {/* Content */}
                        <div className="relative z-10">
                            {/* Icon */}
                            <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-[#6B46C1] to-[#EC4899] flex items-center justify-center">
                                <prop.icon className="w-8 h-8 text-white" />
                            </div>

                            {/* Title */}
                            <h3 className="text-2xl font-bold text-white mb-4">
                                {prop.title}
                            </h3>

                            {/* Points */}
                            <ul className="space-y-3">
                                {prop.points.map((point, i) => (
                                    <li key={i} className="flex items-start gap-2 text-gray-300">
                                        <span className="text-[#EC4899] mt-1">•</span>
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
