import supabase from '../config/supabaseClient';
import { Gallery, GalleryItem } from '@common/types/Gallery';
import { handleQuery } from '../utils/database';

export const findGalleryByFanId = async (fanId: string): Promise<Gallery | null> => {
    return handleQuery<Gallery>(
        supabase.from('galleries').select('*').eq('fan_id', fanId).single(),
        'find gallery by fan ID'
    );
};

export const createGallery = async (fanId: string): Promise<Gallery | null> => {
    return handleQuery<Gallery>(
        supabase.from('galleries').insert([{ fan_id: fanId, content: [] }]).select().single(),
        'create gallery'
    );
};

export const addItemToGallery = async (fanId: string, newItem: GalleryItem): Promise<Gallery | null> => {
    const existingGallery = await findGalleryByFanId(fanId);
    if (!existingGallery) {
        const newGalleryData = { fan_id: fanId, content: [newItem] };
        return handleQuery<Gallery>(
            supabase.from('galleries').insert(newGalleryData).select().single(),
            'create gallery with item'
        );
    }

    const updatedContent = [...existingGallery.content, newItem];

    return handleQuery<Gallery>(
        supabase.from('galleries').update({ content: updatedContent, updated_at: new Date().toISOString() }).eq('fan_id', fanId).select().single(),
        'add item to gallery'
    );
};

export const removeItemFromGallery = async (fanId: string, contentId: string): Promise<Gallery | null> => {
    const existingGallery = await findGalleryByFanId(fanId);
    if (!existingGallery) {
        console.error('Gallery not found for this user.');
        return null;
    }

    const updatedContent = existingGallery.content.filter(item => item.contentId !== contentId);

    return handleQuery<Gallery>(
        supabase.from('galleries').update({ content: updatedContent, updated_at: new Date().toISOString() }).eq('fan_id', fanId).select().single(),
        'remove item from gallery'
    );
};
