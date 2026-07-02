import supabase from '../config/supabaseClient';
import { Content } from '@common/types/Content';
import { handleQuery, handleCount, handleList } from '../utils/database';

export const createContent = async (contentData: Partial<Content>): Promise<Content | null> => {
    const data = await handleQuery<any>(
        supabase.from('content').insert([contentData]).select().single(),
        'create content'
    );
    if (!data) return null;
    const { id: contentId, creator_id, min_tier_level, ...rest } = data;
    return {
        ...rest,
        id: contentId.toString(),
        creator_id: creator_id,
        min_tier_level: min_tier_level
    } as Content;
};

export const countAllContent = async (): Promise<number> => {
    return handleCount(
        supabase.from('content').select('*', { count: 'exact', head: true }),
        'count content'
    );
};

export const findContentById = async (id: string): Promise<Content | null> => {
    const contentId = parseInt(id, 10);
    if (isNaN(contentId)) {
        console.error(`[Model] findContentById: Invalid non-numeric ID passed: "${id}"`);
        return null;
    }

    const data = await handleQuery<any>(
        supabase.from('content').select('*').eq('id', contentId).single(),
        'find content by ID', contentId
    );
    if (!data) return null;
    const { id: dbId, creator_id, min_tier_level, ...rest } = data;
    return {
        ...rest,
        id: dbId.toString(),
        creator_id: creator_id,
        min_tier_level: min_tier_level
    } as Content;
};

export const findContentByIds = async (ids: string[]): Promise<Content[] | null> => {
    if (ids.length === 0) {
        return [];
    }
    const data = await handleList<any>(
        supabase.from('content').select('*').in('id', ids),
        'find content by IDs'
    );
    if (!data) return null;
    return data.map(item => {
        const { id, creator_id, min_tier_level, ...rest } = item;
        return {
            ...rest,
            id: id.toString(),
            creator_id: creator_id,
            min_tier_level: min_tier_level
        } as Content;
    });
};

export const findContentByStatus = async (status: string): Promise<Content[] | null> => {
    const data = await handleList<any>(
        supabase.from('content').select('*').eq('status', status).order('created_at', { ascending: false }),
        'find content by status'
    );
    if (!data) return null;
    return data.map(item => {
        const { id, creator_id, min_tier_level, ...rest } = item;
        return {
            ...rest,
            id: id.toString(),
            creator_id: creator_id,
            min_tier_level: min_tier_level
        } as Content;
    });
};

export const findContentByCreatorId = async (creatorId: string, limit?: number, offset?: number): Promise<Content[] | null> => {
    let query = supabase
        .from('content')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

    if (limit !== undefined && offset !== undefined) {
        query = query.range(offset, offset + limit - 1);
    }

    const data = await handleList<any>(query, 'find content by creator ID');
    if (!data) return null;
    return data.map(item => {
        const { id, creator_id, min_tier_level, ...rest } = item;
        return {
            ...rest,
            id: id.toString(),
            creator_id: creator_id,
            min_tier_level: min_tier_level
        } as Content;
    });
};

export const findContentByCreatorIds = async (creatorIds: string[], options: { limit: number; offset: number }): Promise<any[] | null> => {
    if (creatorIds.length === 0) {
        return [];
    }

    const data = await handleList<any>(
        supabase
            .from('content')
            .select(`
                *,
                creator: creator_id (*)
            `)
            .in('creator_id', creatorIds)
            .eq('status', 'published')
            .in('visibility', ['subscribers_only', 'pay_per_view'])
            .order('created_at', { ascending: false })
            .range(options.offset, options.offset + options.limit - 1),
        'find content by creator IDs'
    );
    if (!data) return null;
    return data.map(item => {
        const { min_tier_level, ...rest } = item;
        return {
            ...rest,
            minTierLevel: min_tier_level
        };
    });
};

export const findRecentContentByCreator = async (creatorId: string, limit: number): Promise<Content[] | null> => {
    const data = await handleList<any>(
        supabase.from('content').select('*').eq('creator_id', creatorId).eq('status', 'published').order('created_at', { ascending: false }).limit(limit),
        'find recent content for creator'
    );
    if (!data) return null;
    return data.map(item => {
        const { id, creator_id, min_tier_level, ...rest } = item;
        return {
            ...rest,
            id: id.toString(),
            creator_id: creator_id,
            min_tier_level: min_tier_level
        } as Content;
    });
};

export const findPublicContentByCreator = async (creatorId: string, limit: number): Promise<Content[] | null> => {
    const data = await handleList<any>(
        supabase.from('content').select('*').eq('creator_id', creatorId).eq('status', 'published').in('visibility', ['subscribers_only', 'pay_per_view']).order('created_at', { ascending: false }).limit(limit),
        'find public content for creator'
    );
    if (!data) return null;
    return data.map(item => ({
        ...item,
        id: item.id.toString(),
        creator_id: item.creator_id,
        min_tier_level: item.min_tier_level
    } as Content));
};

export const sumCreatorContentViews = async (creatorId: string): Promise<number> => {
    const data = await handleList<any>(
        supabase.from('content').select('stats').eq('creator_id', creatorId),
        'sum content views for creator'
    );
    if (!data) return 0;

    return data.reduce((sum, item) => sum + (item.stats?.views || 0), 0);
};

export const updateContent = async (id: string, updates: Partial<Content>): Promise<Content | null> => {
    const data = await handleQuery<any>(
        supabase.from('content').update(updates).eq('id', id).select().single(),
        'update content', id
    );
    if (!data) return null;
    const { id: contentId, creator_id, min_tier_level, ...rest } = data;
    return {
        ...rest,
        id: contentId.toString(),
        creator_id: creator_id,
        min_tier_level: min_tier_level
    } as Content;
};

export const deleteContent = async (id: string): Promise<Content | null> => {
    const data = await handleQuery<any>(
        supabase.from('content').delete().eq('id', id).select().single(),
        'delete content', id
    );
    if (!data) return null;
    const { id: contentId, creator_id, min_tier_level, ...rest } = data;
    return {
        ...rest,
        id: contentId.toString(),
        creator_id: creator_id,
        min_tier_level: min_tier_level
    } as Content;
};
