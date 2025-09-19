// server/utils/content.utils.ts

import supabase from '../config/supabaseClient';
import { Content } from '@common/types/Content';
import { reshapeUserForApp } from './user.utils';

/**
 * A centralized utility to process a raw Content object from the database.
 * It converts private media paths into temporary, secure, public signed URLs.
 * This function is the single source of truth for making content viewable on the frontend.
 *
 * @param post - The raw content object from a Supabase query.
 * @returns A promise that resolves to a new Content object with a public `signedUrl` for its thumbnail.
 */
export const generateSignedUrlsForContent = async (post: any): Promise<any> => {
    // If there are no files, there's nothing to process.
    if (!post.files || post.files.length === 0) {
        return post;
    }

    const processedFiles = await Promise.all(
        post.files.map(async (file: any) => {
            let publicThumbnailUrl = 'https://placehold.co/600x400/1F2937/FFFFFF?text=Invalid+Path';
            let publicFullUrl = 'https://placehold.co/1200x800/1F2937/FFFFFF?text=Invalid+Path';

            // Generate signed URL for the main content file
            if (file.url) {
                const { data, error } = await supabase.storage
                    .from('creator-content')
                    .createSignedUrl(file.url, 60); // 60-second validity

                if (!error && data) {
                    publicFullUrl = data.signedUrl;
                } else {
                     console.error(`Failed to sign full URL for path: ${file.url}`, error);
                }
            }

            // Generate signed URL for the thumbnail
            if (file.thumbnailUrl) {
                const { data, error } = await supabase.storage
                    .from('creator-content')
                    .createSignedUrl(file.thumbnailUrl, 60);

                if (!error && data) {
                    publicThumbnailUrl = data.signedUrl;
                } else {
                    console.error(`Failed to sign thumbnail URL for path: ${file.thumbnailUrl}`, error);
                }
            }
            
            // Return a new file object with the signed URLs
            return {
                ...file,
                url: publicFullUrl,
                thumbnailUrl: publicThumbnailUrl,
            };
        })
    );

    // Return a new post object with the updated files array
    return {
        ...post,
        files: processedFiles,
    };
};

/**
 * A utility to reshape a raw content object from a join query (like in the fan feed)
 * into the `ContentWithCreator` shape expected by the frontend's PostCard component.
 * @param post - The raw post object, including a nested `creator` profile object.
 */
export const reshapePostForFeed = async (post: any): Promise<any> => {
    // First, process the post to get signed URLs
    const postWithSignedUrls = await generateSignedUrlsForContent(post);

    const creatorProfile = post.creator ? reshapeUserForApp(post.creator) : null;
    
    const { 
        id, 
        creator_id, 
        created_at, 
        updated_at, 
        ...restOfPost // Use object destructuring to gather all other properties
    } = postWithSignedUrls;

    return {
        ...restOfPost,
        _id: post.id.toString(),       // Map id -> _id
        creatorId: creator_id,    // Map creator_id -> creatorId
        createdAt: created_at,    // Map created_at -> createdAt
        updatedAt: updated_at,
        creator: creatorProfile, // Nested creator profile
    };
};