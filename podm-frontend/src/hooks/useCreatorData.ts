import { useState, useEffect } from 'react';
import * as apiClient from '../lib/apiClient';
import { User } from '@common/types/User';
import { Content } from '@common/types/Content';
import { Transaction } from '@common/types/Transaction';
import { Creator } from '@common/types/Creator';

// Define the shape of the data needed for the creator dashboard
export interface CreatorDashboardData {
    keyMetrics: {
        subscribers: { value: number; change: number };
        earnings: { value: number; change: number };
        postViews: { value: number; change: number };
        profileVisits: { value: number; change: number };
    };
    recentActivity: (Transaction | Content)[];
    monthlyEarnings: { name: string; earnings: number }[];
}

export const useCreatorData = (creator: Creator | null) => {
    const [dashboardData, setDashboardData] = useState<CreatorDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!creator) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // This endpoint doesn't exist yet, we will create it next
                const response = await apiClient.getCreatorDashboardData();
                setDashboardData(response.data);
            } catch (err) {
                setError('Failed to load creator dashboard data.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [creator]);

    return { dashboardData, isLoading, error };
};