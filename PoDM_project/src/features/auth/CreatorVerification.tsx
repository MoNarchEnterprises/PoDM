import React, { useState } from 'react';
import { Shield, UploadCloud, Camera, CheckCircle, ArrowRight } from 'lucide-react';

// --- Import Reusable Components ---
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/ui/Button';

// --- Local Types ---
interface VerificationData {
    idFile: File;
    selfieFile: File;
    signature: string;
}

// --- Main Verification Page Component ---
interface CreatorVerificationPageProps {
    onSubmit: (data: VerificationData) => void;
}

const CreatorVerificationPage = ({ onSubmit }: CreatorVerificationPageProps) => {
    const [idFile, setIdFile] = useState<File | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [signature, setSignature] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
        const file = e.target.files?.[0];
        if (file) {
            setter(file);
        }
    };

    const canSubmit = idFile && selfieFile && signature.trim() !== '' && agreed;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (canSubmit) {
            onSubmit({ idFile, selfieFile, signature });
            setIsSubmitted(true);
        }
    };

    if (isSubmitted) {
        return (
            <AuthLayout>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
                     <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                     <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verification Submitted</h1>
                     <p className="text-gray-500 dark:text-gray-400 max-w-md">
                        Thank you! Your documents have been submitted for review. This process typically takes 24-48 hours. We will notify you via email once your account has been verified.
                     </p>
                     <Button className="mt-8" size="lg">
                        Go to Dashboard
                    </Button>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <div className="text-center mb-8">
                <Shield className="w-12 h-12 mx-auto text-purple-500" />
                <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">Creator Verification</h1>
                <p className="text-gray-500 dark:text-gray-400">Please complete the following steps to verify your age and identity.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8">
                {/* Step 1: ID Upload */}
                <div>
                    <h2 className="text-lg font-semibold mb-2 flex items-center"><span className="text-purple-500 mr-2">Step 1:</span> Upload Government ID</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Please upload a clear, color photo of your driver's license, passport, or other government-issued ID. Ensure all four corners are visible.</p>
                    <label htmlFor="id-upload" className="cursor-pointer bg-gray-50 dark:bg-gray-700/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center block hover:border-purple-500">
                        {idFile ? (
                            <div className="text-green-500 flex items-center justify-center"><CheckCircle className="w-5 h-5 mr-2" /><span>{idFile.name}</span></div>
                        ) : (
                            <>
                                <UploadCloud className="w-8 h-8 mx-auto text-gray-400" />
                                <span className="mt-2 text-sm text-gray-600 dark:text-gray-300">Click to upload a file</span>
                            </>
                        )}
                    </label>
                    <input id="id-upload" type="file" className="sr-only" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, setIdFile)} />
                </div>

                {/* Step 2: Selfie Upload */}
                <div>
                    <h2 className="text-lg font-semibold mb-2 flex items-center"><span className="text-purple-500 mr-2">Step 2:</span> Upload Selfie with ID</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Upload a photo of yourself holding the same ID. Your face and the ID must be clearly visible.</p>
                     <label htmlFor="selfie-upload" className="cursor-pointer bg-gray-50 dark:bg-gray-700/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center block hover:border-purple-500">
                        {selfieFile ? (
                            <div className="text-green-500 flex items-center justify-center"><CheckCircle className="w-5 h-5 mr-2" /><span>{selfieFile.name}</span></div>
                        ) : (
                            <>
                                <Camera className="w-8 h-8 mx-auto text-gray-400" />
                                <span className="mt-2 text-sm text-gray-600 dark:text-gray-300">Click to upload a file</span>
                            </>
                        )}
                    </label>
                    <input id="selfie-upload" type="file" className="sr-only" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, setSelfieFile)} />
                </div>

                {/* Step 3: Affidavit */}
                <div>
                    <h2 className="text-lg font-semibold mb-2 flex items-center"><span className="text-purple-500 mr-2">Step 3:</span> Sign Affidavit</h2>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-500 dark:text-gray-400 h-24 overflow-y-auto">
                        <p>I hereby swear and affirm under penalty of perjury that I am the individual depicted in the identification and photographs provided. I am at least 18 years of age. I understand that all content I upload must be my own and that I must have the consent of any other individuals depicted.</p>
                    </div>
                    <div className="mt-4 flex items-start space-x-3">
                        <input id="agree" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mt-1" />
                        <label htmlFor="agree" className="text-sm text-gray-700 dark:text-gray-300">I have read and agree to the terms of the affidavit.</label>
                    </div>
                    <div className="mt-4">
                        <label htmlFor="signature" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type your full legal name as an electronic signature:</label>
                        <input type="text" id="signature" value={signature} onChange={(e) => setSignature(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                </div>

                {/* Submission */}
                <div className="pt-4">
                    <Button type="submit" disabled={!canSubmit} className="w-full" size="lg" rightIcon={ArrowRight}>
                        Submit for Review
                    </Button>
                </div>
            </form>
        </AuthLayout>
    );
};

export default CreatorVerificationPage;
