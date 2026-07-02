import supabase from '../config/supabaseClient';
import { handleQuery } from '../utils/database';

export const getSetting = async (key: string) => {
    return handleQuery<any>(
        supabase.from('platform_settings').select('value').eq('key', key).single(),
        'get setting', key
    );
};

export const updateSetting = async (key: string, value: any) => {
    return handleQuery<any>(
        supabase.from('platform_settings').upsert({ key, value }).select().single(),
        'update setting', key
    );
};
