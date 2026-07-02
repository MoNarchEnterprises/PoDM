import supabase from '../config/supabaseClient';
import { Report, ReportStatus } from '@common/types/Report';
import { handleQuery, handleList } from '../utils/database';

export const createReport = async (reporterId: string, contentId: string, reason: string): Promise<Report | null> => {
    const data = await handleQuery<any>(
        supabase.from('reports').insert([{
            reporter_id: reporterId,
            content_id: parseInt(contentId),
            reason,
            status: 'pending'
        }]).select().single(),
        'create report'
    );
    if (!data) return null;

    return mapToReport(data);
};

export const getReportsByContentId = async (contentId: string): Promise<Report[] | null> => {
    const data = await handleList<any>(
        supabase.from('reports').select('*').eq('content_id', parseInt(contentId)),
        'get reports by content ID'
    );
    if (!data) return null;

    return data.map(mapToReport);
};

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
