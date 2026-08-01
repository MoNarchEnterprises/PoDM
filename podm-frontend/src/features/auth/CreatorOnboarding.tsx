import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, DollarSign, CheckCircle, UploadCloud, ArrowRight, ArrowLeft, Wallet, Building2, ExternalLink } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import * as apiClient from '../../lib/apiClient';
import { SubscriptionTier } from '@common/types/Creator';
import { UserProfile } from '@common/types/User';
import Button from '../../components/ui/Button';
import CexGuidanceModal from '../creator/components/CexGuidanceModal';

// --- Local Types ---
interface OnboardingData {
    profile: Partial<UserProfile>;
    tiers: Partial<SubscriptionTier>[];
}

// --- 1. MOVE OnboardingStep and StepTracker OUTSIDE the main component ---
const OnboardingStep = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        {children}
    </div>
);

const StepTracker = ({ totalSteps, step }: { totalSteps: number; step: number; }) => (
    <div className="flex items-center justify-center space-x-4">
        {[...Array(totalSteps)].map((_, i) => {
            const stepNumber = i + 1;
            const isActive = stepNumber === step;
            const isCompleted = stepNumber < step;
            return (
                <div key={stepNumber} className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${
                        isActive ? 'bg-purple-600 text-white' : 
                        isCompleted ? 'bg-green-500 text-white' : 
                        'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}>
                        {isCompleted ? <CheckCircle className="w-5 h-5" /> : stepNumber}
                    </div>
                    {stepNumber < totalSteps && <div className={`h-0.5 w-12 transition-colors ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>}
                </div>
            );
        })}
    </div>
);


const CreatorOnboardingPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const creatorName = user?.profile?.name || 'Creator';
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<OnboardingData>({
        profile: { name: '', bio: '' },
        tiers: [{ name: 'Default Tier', price: 9.99, features: ["All content access", "Direct Messages (DMs)"] }]
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isCexModalOpen, setIsCexModalOpen] = useState(false);
    const totalSteps = 5;

    const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            profile: { ...prev.profile, [id]: value }
        }));
    };

    const handleTierChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        const field = id.split('-')[1] as keyof SubscriptionTier;
        const newTiers = [...formData.tiers];
        (newTiers[index] as Record<string, unknown>)[field] = value;
        setFormData(prev => ({ ...prev, tiers: newTiers }));
    };
    
    const addTier = () => {
        setFormData(prev => ({
            ...prev,
            tiers: [...prev.tiers, { name: '', price: undefined }]
        }));
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            await apiClient.completeCreatorOnboarding(formData);
            navigate('/verification');
        } catch {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4 font-sans">
            <div className="text-purple-500 font-bold text-3xl mb-4">PoDM</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome, {creatorName}!</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Let's get your account set up for success.</p>
            
            <div className="mb-8 w-full max-w-2xl">
                <StepTracker totalSteps={totalSteps} step={step} />
            </div>

            {step === 1 && (
                <OnboardingStep>
                    <h2 className="text-xl font-semibold text-center mb-4">Step 1: Welcome to the Platform</h2>
                    <p className="text-center text-gray-600 dark:text-gray-300">
                        We're thrilled to have you, {creatorName}! This short setup process will help you get your profile ready for your audience. 
                        You'll set up your public profile, create subscription tiers, and learn about our verification process.
                    </p>
                </OnboardingStep>
            )}

            {step === 2 && (
                <OnboardingStep>
                    <h2 className="text-xl font-semibold mb-4 flex items-center"><User className="w-5 h-5 mr-2 text-purple-500"/> Step 2: Set Up Your Profile</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Public Name</label>
                            <input type="text" id="name" value={formData.profile.name} onChange={handleProfileChange} placeholder="e.g., CreatorOne" className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profile Bio</label>
                            <textarea id="bio" rows={4} value={formData.profile.bio} onChange={handleProfileChange} placeholder="Tell your audience a little about yourself and your content..." className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                        </div>
                    </div>
                </OnboardingStep>
            )}

            {step === 3 && (
                <OnboardingStep>
                    <h2 className="text-xl font-semibold mb-4 flex items-center"><DollarSign className="w-5 h-5 mr-2 text-purple-500"/> Step 3: Create Subscription Tiers</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">You can add more later. We recommend starting with one or two.</p>
                    <div className="space-y-4">
                        {formData.tiers.map((tier, index) => (
                             <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <h3 className="font-semibold">Tier {index + 1}</h3>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div>
                                        <label htmlFor={`tier${index}-price`} className="block text-xs font-medium text-gray-500">Price/month</label>
                                        <input type="number" id={`tier${index}-price`} value={tier.price || ''} onChange={(e) => handleTierChange(index, e)} placeholder="9.99" className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                    </div>
                                    <div>
                                        <label htmlFor={`tier${index}-name`} className="block text-xs font-medium text-gray-500">Tier Name</label>
                                        <input type="text" id={`tier${index}-name`} value={tier.name || ''} onChange={(e) => handleTierChange(index, e)} placeholder="e.g., Silver Tier" className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                    </div>
                                </div>
                             </div>
                        ))}
                         <button onClick={addTier} className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">+ Add another tier</button>
                    </div>
                </OnboardingStep>
            )}

            {step === 4 && (
                <OnboardingStep>
                    <h2 className="text-xl font-semibold mb-4 flex items-center"><CheckCircle className="w-5 h-5 mr-2 text-purple-500"/> Step 4: Verification & Account Security</h2>
                    <div className="space-y-6">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-800 rounded-lg">
                            <div className="flex items-center space-x-2 text-purple-800 dark:text-purple-200 font-semibold mb-1">
                                <Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                <h3>Default Payout Wallet Assigned</h3>
                            </div>
                            <p className="text-sm text-purple-700 dark:text-purple-300">
                                A secure Embedded Wallet has been automatically created for your earnings. You can view your wallet address or link a custom exchange wallet address anytime in your <strong>Payout Settings</strong>.
                            </p>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                            <h3 className="font-semibold text-blue-800 dark:text-blue-200">Age Verification Required</h3>
                            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">For the safety of our community, all creators must complete age verification before they can start earning. You will be prompted to do this after setup.</p>
                        </div>
                         <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg text-center">
                            <UploadCloud className="w-8 h-8 mx-auto text-green-500 mb-2"/>
                            <h3 className="font-semibold text-green-800 dark:text-green-200">Profile Ready!</h3>
                            <p className="text-sm text-green-600 dark:text-green-300 mt-1">In the final step, you can optionally connect your bank cashout exchange account.</p>
                        </div>
                    </div>
                </OnboardingStep>
            )}

            {step === 5 && (
                <OnboardingStep>
                    <h2 className="text-xl font-semibold mb-2 flex items-center">
                        <Building2 className="w-5 h-5 mr-2 text-purple-500"/> Step 5: Set Up Fiat Cashout Account (Optional)
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Learn how to withdraw your USDC earnings to your local bank account via a Centralized Exchange (Coinbase, Kraken, Binance, Bitso).
                    </p>

                    <div className="p-5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-4 shadow-sm">
                        <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-purple-600/20 text-purple-600 dark:text-purple-400 rounded-xl">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-base">Centralized Exchange (CEX) Setup</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Direct cashouts to checking accounts, ACH, SEPA, SPEI, or Pix</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                            You can walk through our quick 3-step wizard now to select an exchange and link your deposit address, or click <strong>Skip for now</strong> and complete it anytime under <strong>Settings $\rightarrow$ Payouts & Wallet</strong>.
                        </p>
                        <Button
                            type="button"
                            onClick={() => setIsCexModalOpen(true)}
                            leftIcon={Building2}
                            rightIcon={ExternalLink}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3"
                        >
                            Launch CEX Cashout Setup Guide
                        </Button>
                    </div>
                </OnboardingStep>
            )}

            <div className="mt-8 flex justify-between w-full max-w-2xl">
                <Button onClick={prevStep} disabled={step === 1 || isLoading} leftIcon={ArrowLeft}>
                    Back
                </Button>
                {step < totalSteps ? (
                    <Button onClick={nextStep} rightIcon={ArrowRight} disabled={isLoading}>
                        Next Step
                    </Button>
                ) : (
                    <div className="flex items-center space-x-3">
                        <Button
                            onClick={handleSubmit}
                            isLoading={isLoading}
                            variant="secondary"
                        >
                            Skip for Now
                        </Button>
                        <Button 
                            onClick={handleSubmit} 
                            isLoading={isLoading} 
                            className="bg-green-600 hover:bg-green-700" 
                            rightIcon={CheckCircle}
                        >
                            Finish Setup & Proceed to Verification
                        </Button>
                    </div>
                )}
            </div>

            <CexGuidanceModal
                isOpen={isCexModalOpen}
                onClose={() => setIsCexModalOpen(false)}
            />
        </div>
    );
};

export default CreatorOnboardingPage;
