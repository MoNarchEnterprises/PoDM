export interface Contest {
    id: string;
    creator_id: string;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    entry_requirements: Record<string, any>; // e.g. { tier_id: "..." }
    prize_description: string;
    status: 'draft' | 'active' | 'completed' | 'canceled';
    winner_id?: string;
    entry_type: 'standard' | 'weighted_spend';
    entry_multiplier?: number; // Deprecated but kept for backward compatibility
    spend_threshold?: number; // Cents required for additional entries
    additional_entries?: number; // Number of entries granted per threshold
    created_at: string;
    hasEntered?: boolean; // For fan view
    winner_details?: {
        username: string;
        avatar_url?: string;
    };
}
