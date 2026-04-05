import { Check, X } from 'lucide-react';

export default function EnclaveComparison() {
    const features = [
        { name: 'Creator Cut', podm: '90%', onlyfans: '80%', fansly: '80%', youtube: '70%', highlight: true },
        { name: 'Platform Fee', podm: '10% (lifetime)', onlyfans: '20%', fansly: '20%', youtube: '30% (memberships)', highlight: true },
        { name: 'Content Protection', podm: 'Advanced watermarking', onlyfans: 'Basic', fansly: 'Basic', youtube: 'Basic', highlight: false },
        { name: 'Privacy', podm: 'Velvet rope, private', onlyfans: 'Public profiles', fansly: 'Public profiles', youtube: 'Public profiles', highlight: false },
        { name: 'Support', podm: 'Priority, direct access', onlyfans: 'Email only', fansly: 'Email only', youtube: 'Email only', highlight: false },
        { name: 'Feature Input', podm: true, onlyfans: false, fansly: false, youtube: false, highlight: false },
        { name: 'AI Content', podm: 'Fully supported', onlyfans: 'Restricted', fansly: 'Restricted', youtube: 'Restricted', highlight: false }
    ];

    return (
        <div className="max-w-6xl mx-auto px-6">
            {/* Section header */}
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    Platform Comparison
                </h2>
                <p className="text-xl text-gray-400">
                    See how The Enclave stacks up against the competition
                </p>
            </div>

            {/* Comparison table */}
            <div className="overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                    <div className="grid grid-cols-5 gap-4">
                        {/* Header row */}
                        <div className="font-semibold text-gray-400 text-sm uppercase tracking-wider py-4">
                            Feature
                        </div>
                        <div className="text-center py-4">
                            <div className="inline-block px-6 py-2 rounded-full bg-gradient-to-r from-[#6B46C1] to-[#EC4899] text-white font-bold text-lg">
                                PoDM Enclave
                            </div>
                        </div>
                        <div className="text-center font-semibold text-gray-300 py-4">
                            OnlyFans
                        </div>
                        <div className="text-center font-semibold text-gray-300 py-4">
                            Fansly
                        </div>
                        <div className="text-center font-semibold text-gray-300 py-4">
                            YouTube
                        </div>

                        {/* Feature rows */}
                        {features.map((feature, index) => (
                            <div key={index} className="col-span-5 grid grid-cols-5 gap-4 py-4 border-t border-gray-800">
                                {/* Feature name */}
                                <div className="font-medium text-white flex items-center">
                                    {feature.name}
                                </div>

                                {/* PoDM value */}
                                <div className={`text-center flex items-center justify-center p-4 rounded-xl ${feature.highlight ? 'bg-[#6B46C1]/20 border border-[#6B46C1]/30' : 'bg-gray-900/40'}`}>
                                    {typeof feature.podm === 'boolean' ? (
                                        feature.podm ? (
                                            <Check className="w-6 h-6 text-green-400" />
                                        ) : (
                                            <X className="w-6 h-6 text-red-400" />
                                        )
                                    ) : (
                                        <span className={`font-semibold ${feature.highlight ? 'text-[#EC4899]' : 'text-white'}`}>
                                            {feature.podm}
                                        </span>
                                    )}
                                </div>

                                {/* OnlyFans value */}
                                <div className="text-center flex items-center justify-center p-4 rounded-xl bg-gray-900/40">
                                    {typeof feature.onlyfans === 'boolean' ? (
                                        feature.onlyfans ? (
                                            <Check className="w-6 h-6 text-green-400" />
                                        ) : (
                                            <X className="w-6 h-6 text-red-400" />
                                        )
                                    ) : (
                                        <span className="text-gray-400">{feature.onlyfans}</span>
                                    )}
                                </div>

                                {/* Fansly value */}
                                <div className="text-center flex items-center justify-center p-4 rounded-xl bg-gray-900/40">
                                    {typeof feature.fansly === 'boolean' ? (
                                        feature.fansly ? (
                                            <Check className="w-6 h-6 text-green-400" />
                                        ) : (
                                            <X className="w-6 h-6 text-red-400" />
                                        )
                                    ) : (
                                        <span className="text-gray-400">{feature.fansly}</span>
                                    )}
                                </div>

                                {/* YouTube value */}
                                <div className="text-center flex items-center justify-center p-4 rounded-xl bg-gray-900/40">
                                    {typeof feature.youtube === 'boolean' ? (
                                        feature.youtube ? (
                                            <Check className="w-6 h-6 text-green-400" />
                                        ) : (
                                            <X className="w-6 h-6 text-red-400" />
                                        )
                                    ) : (
                                        <span className="text-gray-400">{feature.youtube}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom tagline */}
            <div className="mt-12 text-center">
                <p className="text-sm text-gray-500">
                    Empowering Creators | Secure Future | Community Driven
                </p>
            </div>
        </div>
    );
}
