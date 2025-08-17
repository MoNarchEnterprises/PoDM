import supabase from '../config/supabaseClient';
import { Content } from '@common/types/Content';

/**
 * Creates a new piece of content in the database.
 * @param contentData - The data for the new content.
 * @returns The newly created content object.
 */
export const createContent = async (contentData: Partial<Content>): Promise<Content | null> => {
    const { data, error } = await supabase
        .from('content')
        .insert([contentData])
        .select()
        .single();

    if (error) {
        console.error('Error creating content:', error.message);
        return null;
    }
    return data as Content;
};

/**
 * Counts the total number of content pieces in the database.
 */
export const countAllContent = async (): Promise<number> => {
    const { count, error } = await supabase
        .from('content')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error counting content:', error.message);
        return 0;
    }
    return count || 0;
};

/**
 * Finds a single piece of content by its unique ID.
 * @param id - The ID of the content to find.
 * @returns The content object or null if not found.
 */
export const findContentById = async (id: string): Promise<Content | null> => {
    const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error finding content by ID:', error.message);
        return null;
    }
    return data as Content;
};

/**
 * Finds content by its status (e.g., 'published', 'flagged', 'removed').
 * @param status - The status to filter content by.
 */
export const findContentByStatus = async (status: string): Promise<Content[] | null> => {
    const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error finding content by status:', error.message);
        return null;
    }
    return data as Content[];
};

/**
 * Finds all content created by a specific creator.
 * @param creatorId - The UUID of the creator.
 * @returns An array of content objects.
 */
export const findContentByCreatorId = async (creatorId: string): Promise<Content[] | null> => {
    const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error finding content by creator ID:', error.message);
        return null;
    }
    return data as Content[];
};

/**
 * Updates a piece of content in the database.
 * @param id - The ID of the content to update.
 * @param updates - An object containing the fields to update.
 * @returns The updated content object.
 */
export const updateContent = async (id: string, updates: Partial<Content>): Promise<Content | null> => {
    const { data, error } = await supabase
        .from('content')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating content:', error.message);
        return null;
    }
    return data as Content;
};

/**
 * Deletes a piece of content from the database.
 * Note: This does not delete the associated files from storage.
 * That should be handled in a service layer.
 * @param id - The ID of the content to delete.
 * @returns The deleted content object.
 */
export const deleteContent = async (id: string): Promise<Content | null> => {
    const { data, error } = await supabase
        .from('content')
        .delete()
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error deleting content:', error.message);
        return null;
    }
    return data as Content;
};
