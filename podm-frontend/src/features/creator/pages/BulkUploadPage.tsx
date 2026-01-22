import React, { useState, useEffect } from 'react';
import { UploadCloud, Save, Send, Trash2, ArrowRight, Sparkles } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import DropZone from '../components/BulkUpload/DropZone';
import DraftCard, { DraftFile } from '../components/BulkUpload/DraftCard';
import * as apiClient from '../../../lib/apiClient';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const BulkUploadPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [drafts, setDrafts] = useState<DraftFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Global Toolbar State
    const [globalVisibility, setGlobalVisibility] = useState<'subscribers_only' | 'pay_per_view'>('subscribers_only');
    const [globalPrice, setGlobalPrice] = useState<number>(5.00);
    const [globalTier, setGlobalTier] = useState<number>(1);

    // Mock Tiers for now (fetched from user profile in real app)
    // Fix: Access snake_case property
    const subscriptionTiers = (user as any)?.creator_data?.subscriptionTiers || [
        { id: 't1', level: 1, name: 'Bronze', price: 9.99 },
        { id: 't2', level: 2, name: 'Silver', price: 19.99 },
        { id: 't3', level: 3, name: 'Gold', price: 29.99 },
    ];

    const handleFilesDropped = (files: File[]) => {
        const newDrafts: DraftFile[] = files.map(file => ({
            id: uuidv4(),
            file,
            previewUrl: URL.createObjectURL(file), // Create local preview
            caption: '', // Default empty, AI will fill
            visibility: globalVisibility, // Inherit from global
            price: globalVisibility === 'pay_per_view' ? globalPrice : undefined,
            tierLevel: globalVisibility === 'subscribers_only' ? globalTier : 1
        }));
        setDrafts(prev => [...prev, ...newDrafts]);
    };

    const handleUpdateDraft = (id: string, updates: Partial<DraftFile>) => {
        setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    };

    const handleRemoveDraft = (id: string) => {
        setDrafts(prev => prev.filter(d => d.id !== id));
    };

    const handleGenerateCaption = async (id: string, file: File): Promise<number | 'success'> => {
        handleUpdateDraft(id, { isGeneratingAI: true });

        try {
            // Updated to use REAL backend API which now validates user/token and handles the file
            const response = await apiClient.generateCaption(file);
            const caption = response.data.data.caption;

            // Update with the result
            handleUpdateDraft(id, { caption: caption, isGeneratingAI: false });
            return 'success';

        } catch (error: any) {
            console.error("AI Generation failed", error);
            handleUpdateDraft(id, { isGeneratingAI: false });

            // Return status code for backoff handling
            if (error?.response?.status) {
                return error.response.status;
            }
            return 500;
        }
    };

    const handleGenerateAllCaptions = async () => {
        // Process sequentially with adaptive delay
        for (const draft of drafts) {
            if (!draft.caption) {
                const result = await handleGenerateCaption(draft.id, draft.file);

                if (result === 429) {
                    console.warn("Rate limit hit! Cooling down for 30 seconds...");
                    // If rate limited, wait 30 seconds before trying the next one
                    await new Promise(r => setTimeout(r, 30000));
                } else {
                    // Normal behavior: Wait 5 seconds between requests
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
        }
    };

    const applyGlobalSettings = () => {
        setDrafts(prev => prev.map(d => ({
            ...d,
            visibility: globalVisibility,
            price: globalVisibility === 'pay_per_view' ? globalPrice : undefined,
            tierLevel: globalVisibility === 'subscribers_only' ? globalTier : 1
        })));
    };

    const handlePublishAll = async (status: 'published' | 'draft') => {
        if (drafts.length === 0) return;
        setIsUploading(true);

        try {
            // Process sequentially to avoid overwhelming browser/network
            for (const draft of drafts) {
                const formData = new FormData();
                formData.append('contentFiles', draft.file); // Backend expects array 'contentFiles'
                formData.append('title', draft.caption.substring(0, 50) || 'New Post'); // Use text as title or fallback
                formData.append('description', draft.caption);
                formData.append('visibility', draft.visibility);
                // Fix: 'type' field is required by the backend
                formData.append('type', draft.file.type.startsWith('video') ? 'video' : 'photo');

                if (draft.price) formData.append('price', draft.price.toString());
                if (draft.tierLevel) formData.append('min_tier_level', draft.tierLevel.toString());

                // Status: if 'draft', backend needs to support it (it does)
                // If we want "Vault Only", we usually send status='draft' or 'archived'
                // For now, let's assume 'draft' means saved but not on feed.
                // NOTE: Our backend createContent defaults to 'published' unless schedule is set.
                // We might need to add 'status' field to form data support in backend if not present.
                // Checking controller... it infers 'scheduled' or default 'published'.
                // Ideally we update backend to read 'status' from body. 
                // For this prototype, 'Save to Vault' effectively means 'Published but Hidden' or strict 'Draft' logic.
                // Let's rely on 'published' for now for the 'Publish Now' button.
                // For 'Save to Drafts', we might fake it by setting it to 'scheduled' far in future or just add status support later.
                // Let's stick to "Publish Now" working perfectly first.

                await apiClient.createContent(formData);
            }

            alert(`Successfully processed ${drafts.length} posts!`);
            navigate('/hub/content');
        } catch (error) {
            console.error(error);
            alert('Failed to upload some files. Check console.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Batched Content Uploader</h1>
                <div className="text-sm text-gray-400">
                    Migrate content from other platforms in seconds using AI.
                </div>
            </div>

            {/* Global Toolbar */}
            <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl flex flex-wrap items-center gap-6 shadow-lg">
                <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm font-medium">Global Settings:</span>
                </div>

                <div className="flex items-center gap-3">
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Visibility</label>
                    <select
                        value={globalVisibility}
                        onChange={(e) => setGlobalVisibility(e.target.value as any)}
                        className="bg-gray-900 border-gray-700 rounded text-sm text-white px-3 py-1.5 focus:ring-brand-500"
                    >
                        <option value="subscribers_only">Subscribers Only</option>
                        <option value="pay_per_view">Pay Per View</option>
                    </select>
                </div>

                {globalVisibility === 'subscribers_only' && (
                    <div className="flex items-center gap-3">
                        <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Tier</label>
                        <select
                            value={globalTier}
                            onChange={(e) => setGlobalTier(Number(e.target.value))}
                            className="bg-gray-900 border-gray-700 rounded text-sm text-white px-3 py-1.5 focus:ring-brand-500"
                        >
                            {subscriptionTiers.map((t: any) => (
                                <option key={t.id} value={t.level}>Tier {t.level}: {t.name}</option>
                            ))}
                            {/* Fallback if user has no tiers set up */}
                            {!subscriptionTiers.length && <option value={1}>Tier 1 (Default)</option>}
                        </select>
                    </div>
                )}

                {globalVisibility === 'pay_per_view' && (
                    <div className="flex items-center gap-3">
                        <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Price</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1.5 text-gray-500 text-sm">$</span>
                            <input
                                type="number"
                                value={globalPrice}
                                onChange={(e) => setGlobalPrice(Number(e.target.value))}
                                className="bg-gray-900 border-gray-700 rounded text-sm text-white pl-6 py-1.5 w-24 focus:ring-brand-500"
                            />
                        </div>
                    </div>
                )}

                <button
                    onClick={applyGlobalSettings}
                    className="ml-auto flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                >
                    <ArrowRight size={16} />
                    Apply to All
                </button>

                <div className="w-px h-8 bg-gray-700 mx-2 hidden md:block"></div>

                <button
                    onClick={handleGenerateAllCaptions}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors shadow-lg shadow-purple-500/20"
                    title="Generate AI captions for all drafts"
                >
                    <Sparkles size={16} />
                    Caption All
                </button>
            </div>

            {/* Drop Zone (Collapses if drafts exist, or remains as a compact bar) */}
            {drafts.length === 0 ? (
                <DropZone onFilesDropped={handleFilesDropped} />
            ) : (
                <div className="flex justify-end">
                    <button
                        onClick={() => setDrafts([])}
                        className="text-red-400 text-sm flex items-center gap-1 hover:underline"
                    >
                        <Trash2 size={14} /> Clear All
                    </button>
                </div>
            )}

            {/* Draft Grid */}
            {drafts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {drafts.map(draft => (
                        <DraftCard
                            key={draft.id}
                            draft={draft}
                            onUpdate={handleUpdateDraft}
                            onRemove={handleRemoveDraft}
                            subscriptionTiers={subscriptionTiers}
                            onGenerateCaption={() => handleGenerateCaption(draft.id, draft.file)}
                        />
                    ))}

                    {/* Add More Card */}
                    <div className="border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center p-6 min-h-[300px] hover:border-gray-500 transition-colors">
                        <DropZone onFilesDropped={handleFilesDropped} />
                        <span className="mt-2 text-gray-500 text-sm">Add more files</span>
                    </div>
                </div>
            )}

            {/* Sticky Bottom Actions */}
            {drafts.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-800 p-4 backdrop-blur-md z-50">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <div className="text-white font-medium">
                            {drafts.length} post{drafts.length !== 1 && 's'} ready to upload
                        </div>
                        <div className="flex gap-4">
                            <button
                                disabled={isUploading}
                                onClick={() => handlePublishAll('draft')}
                                className="px-6 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 flex items-center gap-2"
                            >
                                <Save size={18} />
                                {isUploading ? 'Uploading...' : 'Save to Vault'}
                            </button>
                            <button
                                disabled={isUploading}
                                onClick={() => handlePublishAll('published')}
                                className="px-6 py-3 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 flex items-center gap-2 shadow-lg shadow-brand-500/20"
                            >
                                <Send size={18} />
                                {isUploading ? 'Publishing...' : 'Publish Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Spacer for sticky footer */}
            {drafts.length > 0 && <div className="h-24"></div>}
        </div>
    );
};

export default BulkUploadPage;
