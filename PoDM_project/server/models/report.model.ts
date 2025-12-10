import supabase from '../config/supabaseClient';
import { Report, ReportStatus } from '@common/types/Report';

/**
 * Creates a new report in the database.
 */
export const createReport = async (reporterId: string, contentId: string, reason: string): Promise<Report | null> => {
    const { data, error } = await supabase
        .from('reports')
        .insert([{
            reporter_id: reporterId,
            content_id: parseInt(contentId),
            reason,
            status: 'pending'
        }])
        .select()
        .single();

    if (error) {
        console.error('Error creating report:', error.message);
        return null;
    }

    return mapToReport(data);
};

/**
 * Finds all reports for a specific piece of content.
 */
export const getReportsByContentId = async (contentId: string): Promise<Report[] | null> => {
    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('content_id', parseInt(contentId));

    if (error) {
        console.error('Error fetching reports for content:', error.message);
        return null;
    }

    return data.map(mapToReport);
};

/**
 * Dismisses all reports for a specific content ID (e.g. after approval).
 */
export const dismissReportsForContent = async (contentId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('reports')
        .update({ status: 'dismissed' })
        .eq('content_id', parseInt(contentId));

    if (error) {
        console.error('Error dismissing reports:', error.message);
        return false;
    }
    return true;
};

/**
 * Helper to map DB snake_case to app camelCase
 */
const mapToReport = (data: any): Report => {
    return {
        id: data.id,
        reporterId: data.reporter_id,
        contentId: data.content_id.toString(),
        reason: data.reason,
        status: data.status,
        createdAt: data.created_at
    };
};
