import React from 'react';
import { CheckCircle } from 'lucide-react';

// --- Import Shared Types ---
import { SubscriptionTier } from '@common/types/Creator';

// --- Main Tier Card Component ---
interface TierCardProps {
    /**
     * The subscription tier object to display.
     */
    tier: SubscriptionTier;
    /**
     * A function to be called when the card is clicked.
     */
    onSelect: (id: string) => void;
    /**
     * If true, the card will be displayed in a selected state.
     */
    isSelected: boolean;
}

const TierCard = ({ tier, onSelect, isSelected }: TierCardProps) => {
    return (
        <div 
            onClick={() => onSelect(tier.id)}
            className={`p-4 border-2 rounded-xl cursor-pointer transition-all h-full flex flex-col ${isSelected ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-400'}`}
        >
            <h3 className="text-md font-bold text-purple-600 dark:text-purple-400">{tier.name}</h3>
            <p className="text-2xl font-extrabold my-2 text-gray-900 dark:text-white">
                ${tier.price.toFixed(2)}
                <span className="text-sm font-medium text-gray-500">/month</span>
            </p>
            <ul className="space-y-1 mt-2 text-xs flex-grow">
                {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-center space-x-2">
                        <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                    </li>
                ))}
            </ul>
            <button 
                className={`mt-4 w-full py-2 text-sm font-bold rounded-lg transition-colors ${isSelected ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300'}`}
            >
                {isSelected ? 'Selected' : 'Select'}
            </button>
        </div>
    );
};

export default TierCard;
