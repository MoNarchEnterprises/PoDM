export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';

export interface Report {
    id: string; // UUID
    reporterId: string; // UUID of the user who reported
    contentId: string; // ID of the content being reported
    reason: string;
    details?: string;
    status: ReportStatus;
    createdAt: string; // ISO Date string
}
