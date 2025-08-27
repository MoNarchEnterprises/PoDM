// /server/models/settings.model.ts

import supabase from '../config/supabaseClient';

/**
 * Retrieves a setting by its key.
 * @param key - The unique key for the setting (e.g., 'platform_commission_rate').
 * @returns The setting object or null if not found.
 */
export const getSetting = async (key: string) => {
    const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', key)
        .single();

    if (error) {
        console.error(`Error fetching setting for key "${key}":`, error.message);
        return null;
    }
    return data;
};

/**
 * Creates or updates a setting in the database.
 * @param key - The unique key for the setting.
 * @param value - The value to save for the setting.
 * @returns The updated setting object.
 */
export const updateSetting = async (key: string, value: any) => {
    const { data, error } = await supabase
        .from('platform_settings')
        .upsert({ key, value }) // upsert = insert or update
        .select()
        .single();

    if (error) {
        console.error(`Error updating setting for key "${key}":`, error.message);
        return null;
    }
    return data;
};