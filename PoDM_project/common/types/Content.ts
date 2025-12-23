// /common/types/Content.ts

/**
 * Defines the possible types of content.
 */
export type ContentType = 'photo' | 'video' | 'text' | 'audio';

/**
 * Defines the visibility options for content.
 */
export type ContentVisibility = 'subscribers_only' | 'pay_per_view' | 'unlisted';

/**
 * Defines the publishing status of content.
 */
export type ContentStatus = 'draft' | 'published' | 'scheduled' | 'flagged';

/**
 * Defines the structure for a single media file (photo or video) attached to a piece of content.
 */
export interface MediaFile {
  id: string; // Unique identifier for the file
  url: string; // URL to the full-size media
  thumbnailUrl: string; // URL to a smaller thumbnail/preview
  size: number; // File size in bytes
  mimeType: string; // e.g., 'image/jpeg', 'video/mp4'
}

/**
 * Defines the structure for content performance statistics.
 */
export interface ContentStats {
  views: number;
  galleryAdds: number;
  tips: number; // total amount in cents
  ppvEarnings?: number; // PPV earnings in cents, calculated from transactions
}

/**
 * Defines the structure for scheduling content to be published later.
 */
export interface Schedule {
  isScheduled: boolean;
  publishDate?: string; // ISO 8601 date string
}

/**
 * The main Content interface, representing a single post made by a creator.
 */
export interface Content {
  id: string; // Unique identifier from the database
  creator_id: string; // The ID of the user who created this content
  title: string;
  description: string;
  type: ContentType;
  files: MediaFile[];
  visibility: ContentVisibility;
  min_tier_level?: number; // Optional, only if visibility is 'subscribers_only'
  price?: number; // Optional, only required if visibility is 'pay_per_view'
  tags: string[];
  stats: ContentStats;
  schedule: Schedule;
  status: ContentStatus;
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
  isUnlocked?: boolean; // Frontend-only: Whether the current user can view this content
  isSubscribedToCreator?: boolean; // Frontend-only: Whether the current user is subscribed to the creator
}
