import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function EnclaveFAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const faqs = [
        {
            question: 'What is The Enclave?',
            answer: 'The Enclave is our founding creator program. The first 50 creators to join PoDM receive lifetime benefits including a 90/10 revenue split, priority support, and the ability to shape platform features.'
        },
        {
            question: 'How long does the 90/10 split last?',
            answer: 'Forever. As an Enclave member, you lock in the 90/10 split for life, even as the platform grows. This is a lifetime guarantee.'
        },
        {
            question: 'What content is allowed?',
            answer: 'All legal content is welcome - adult content, AI-generated content, artistic content, etc. We have clear, consistent policies with no surprise changes.'
        },
        {
            question: 'How do I get paid?',
            answer: 'Payments are processed through Stripe with weekly payouts directly to your bank account. Fast, secure, and reliable.'
        },
        {
            question: 'Can I stay on other platforms?',
            answer: 'Absolutely! Many creators use multiple platforms. We encourage you to diversify your income streams.'
        },
        {
            question: 'What happens after 50 creators join?',
            answer: 'The Enclave closes permanently. Future creators will have standard terms (85/15 split). This is a one-time opportunity for founding members only.'
        },
        {
            question: 'Is my identity kept private?',
            answer: 'Yes. PoDM operates as a velvet rope platform. We never publicly disclose Enclave members or feature creators in marketing materials without explicit permission. Your privacy is paramount.'
        },
        {
            question: 'What if I don\'t have an existing audience?',
            answer: 'While we prioritize creators with established audiences for The Enclave, we evaluate each application individually. Show us your plan and potential in your application.'
        }
    ];

    return (
        <div className="max-w-4xl mx-auto px-6">
            {/* Section header */}
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    Frequently Asked Questions
                </h2>
                <p className="text-xl text-gray-400">
                    Everything you need to know about The Enclave
                </p>
            </div>

            {/* FAQ accordion */}
            <div className="space-y-4">
                {faqs.map((faq, index) => (
                    <div
                        key={index}
                        className="rounded-xl bg-gray-900/40 backdrop-blur-lg border border-gray-700/50 overflow-hidden transition-all duration-300 hover:border-[#6B46C1]/50"
                    >
                        <button
                            onClick={() => setOpenIndex(openIndex === index ? null : index)}
                            className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-800/30 transition-colors"
                        >
                            <span className="text-lg font-semibold text-white pr-4">
                                {faq.question}
                            </span>
                            <ChevronDown
                                className={`w-5 h-5 text-[#EC4899] flex-shrink-0 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''
                                    }`}
                            />
                        </button>
                        <div
                            className={`overflow-hidden transition-all duration-300 ${openIndex === index ? 'max-h-96' : 'max-h-0'
                                }`}
                        >
                            <div className="px-6 pb-5 text-gray-300 leading-relaxed">
                                {faq.answer}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
