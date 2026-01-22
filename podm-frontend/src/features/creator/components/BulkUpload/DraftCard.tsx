import React, { useState } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import * as apiClient from '../../../../../lib/apiClient';

export interface DraftFile {
    id: string; // unique ID for React keys
    file: File;
    previewUrl: string;
    caption: string;
    visibility: 'subscribers_only' | 'pay_per_view';
    price?: number; // In dollars
    tierLevel: number; // 1-10
    isGeneratingAI?: boolean;
}

interface DraftCardProps {
    draft: DraftFile;
    onUpdate: (id: string, updates: Partial<DraftFile>) => void;
    onRemove: (id: string) => void;
    subscriptionTiers: any[]; // Pass available tiers for the selector
    onGenerateCaption: () => void; // New prop
}

const DraftCard: React.FC<DraftCardProps> = ({ draft, onUpdate, onRemove, subscriptionTiers, onGenerateCaption }) => {


    return (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex flex-col gap-4 relative group">
            <button
                onClick={() => onRemove(draft.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
                <X size={16} />
            </button>

            {/* Top: Image + Info */}
            <div className="flex gap-4">
                <div className="w-24 h-24 flex-shrink-0 bg-gray-900 rounded-md overflow-hidden relative">
                    {draft.file.type.startsWith('video') ? (
                        <video
                            src={draft.previewUrl}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            onMouseOver={(e) => e.currentTarget.play()}
                            onMouseOut={(e) => e.currentTarget.pause()}
                        />
                    ) : (
                        <img
                            src={draft.previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>

                <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-white max-w-[150px] truncate" title={draft.file.name}>
                            {draft.file.name}
                        </p>
                        <span className="text-xs text-gray-500">{(draft.file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>

                    {/* Visibility & Price Row */}
                    <div className="flex gap-2 text-sm">
                        <select
                            value={draft.visibility}
                            onChange={(e) => onUpdate(draft.id, { visibility: e.target.value as any })}
                            className="bg-gray-700 border-none rounded text-white text-xs px-2 py-1 focus:ring-1 focus:ring-brand-500"
                        >
                            <option value="subscribers_only">Subscribers Only</option>
                            <option value="pay_per_view">Pay Per View</option>
                        </select>

                        {draft.visibility === 'pay_per_view' && (
                            <div className="relative w-20">
                                <span className="absolute left-2 top-1 text-gray-400 text-xs">$</span>
                                <input
                                    type="number"
                                    value={draft.price || ''}
                                    placeholder="5.00"
                                    onChange={(e) => onUpdate(draft.id, { price: parseFloat(e.target.value) })}
                                    className="w-full bg-gray-700 border-none rounded text-white text-xs pl-5 py-1 focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                        )}

                        {draft.visibility === 'subscribers_only' && (
                            <select
                                value={draft.tierLevel}
                                onChange={(e) => onUpdate(draft.id, { tierLevel: parseInt(e.target.value) })}
                                className="bg-gray-700 border-none rounded text-white text-xs px-2 py-1 focus:ring-1 focus:ring-brand-500 max-w-[100px]"
                            >
                                {subscriptionTiers.map(t => (
                                    <option key={t.id} value={t.level}>Tier {t.level}: {t.name}</option>
                                ))}
                                {/* Fallback if no tiers loaded */}
                                {subscriptionTiers.length === 0 && <option value={1}>Tier 1</option>}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom: Caption Area */}
            <div className="relative">
                <textarea
                    value={draft.caption}
                    onChange={(e) => onUpdate(draft.id, { caption: e.target.value })}
                    placeholder="Write a caption..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-md p-2 text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-brand-500 focus:outline-none min-h-[80px]"
                />
                <button
                    onClick={onGenerateCaption}
                    disabled={draft.isGeneratingAI}
                    className={`absolute bottom-2 right-2 p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs
                        ${draft.isGeneratingAI ? 'bg-brand-500/20 text-brand-300 animate-pulse' : 'bg-gray-800 text-brand-400 hover:bg-gray-700 border border-brand-500/30'}
                    `}
                    title="Auto-generate caption with AI"
                >
                    <Sparkles size={14} />
                    {draft.isGeneratingAI ? 'Writing...' : 'AI Caption'}
                </button>
            </div>
        </div>
    );
};

export default DraftCard;
