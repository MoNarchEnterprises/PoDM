import supabase from '../config/supabaseClient';
import { Gallery, GalleryItem } from '@common/types/Gallery';

/**
 * Finds a fan's gallery by their unique user ID.
 * @param fanId - The UUID of the fan.
 * @returns The fan's gallery object or null if not found.
 */
export const findGalleryByFanId = async (fanId: string): Promise<Gallery | null> => {
    const { data, error } = await supabase
        .from('galleries')
        .select('*')
        .eq('fan_id', fanId)
        .single();

    if (error) {
        console.error('Error finding gallery by fan ID:', error.message);
        return null;
    }
    return data as Gallery;
};

/**
 * Creates a new, empty gallery for a fan.
 * This is typically called the first time a fan saves an item.
 * @param fanId - The UUID of the fan.
 * @returns The newly created gallery object.
 */
export const createGallery = async (fanId: string): Promise<Gallery | null> => {
    const { data, error } = await supabase
        .from('galleries')
        .insert([{ fan_id: fanId, content: [] }])
        .select()
        .single();

    if (error) {
        console.error('Error creating gallery:', error.message);
        return null;
    }
    return data as Gallery;
};

/**
 * Adds a new item to a fan's gallery.
 * This function appends to the 'content' JSONB array.
 * @param fanId - The UUID of the fan.
 * @param newItem - The GalleryItem object to add.
 * @returns The updated gallery object.
 */
export const addItemToGallery = async (fanId: string, newItem: GalleryItem): Promise<Gallery | null> => {
    // Supabase doesn't have a direct "append to JSON array" function in the JS client's update method.
    // This is best handled by a PostgreSQL function (RPC).

    // For demonstration, here's how you'd do it with a read-then-write pattern,
    // though this is not ideal due to potential race conditions.
    const existingGallery = await findGalleryByFanId(fanId);
    if (!existingGallery) {
        // If no gallery exists, create one with the new item.
        const newGalleryData = { fan_id: fanId, content: [newItem] };
        const { data, error } = await supabase.from('galleries').insert(newGalleryData).select().single();
        if (error) {
            console.error('Error creating gallery with item:', error.message);
            return null;
        }
        return data as Gallery;
    }

    const updatedContent = [...existingGallery.content, newItem];

    const { data, error } = await supabase
        .from('galleries')
        .update({ content: updatedContent, updated_at: new Date().toISOString() })
        .eq('fan_id', fanId)
        .select()
        .single();

    if (error) {
        console.error('Error adding item to gallery:', error.message);
        return null;
    }
    return data as Gallery;
};

/**
 * Removes an item from a fan's gallery.
 * @param fanId - The UUID of the fan.
 * @param contentId - The ID of the content to remove.
 * @returns The updated gallery object.
 */
export const removeItemFromGallery = async (fanId: string, contentId: string): Promise<Gallery | null> => {
    const existingGallery = await findGalleryByFanId(fanId);
    if (!existingGallery) {
        console.error('Gallery not found for this user.');
        return null;
    }

    const updatedContent = existingGallery.content.filter(item => item.contentId !== contentId);

    const { data, error } = await supabase
        .from('galleries')
        .update({ content: updatedContent, updated_at: new Date().toISOString() })
        .eq('fan_id', fanId)
        .select()
        .single();

    if (error) {
        console.error('Error removing item from gallery:', error.message);
        return null;
    }
    return data as Gallery;
};
