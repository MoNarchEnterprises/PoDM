import supabase from '../config/supabaseClient';

type QueryBuilder = PromiseLike<{ data: any; error: any }>;

function logError(context: string, error: any, id?: string | number) {
  const msg = id ? `[DB] ${context} ${id}: ${error.message}` : `[DB] ${context}: ${error.message}`;
  console.error(msg);
}

export async function handleQuery<T>(
  query: QueryBuilder,
  context: string,
  id?: string | number
): Promise<T | null> {
  const { data, error } = await query;
  if (error) {
    if (error.code !== 'PGRST116') logError(context, error, id);
    return null;
  }
  return data as T;
}

export async function handleCount(
  query: PromiseLike<{ count: number | null; error: any }>,
  context: string
): Promise<number> {
  const { count, error } = await query;
  if (error) {
    logError(context, error);
    return 0;
  }
  return count || 0;
}

export async function handleList<T>(
  query: PromiseLike<{ data: any[] | null; error: any }>,
  context: string
): Promise<T[] | null> {
  const { data, error } = await query;
  if (error) {
    logError(context, error);
    return null;
  }
  return (data || []) as T[];
}

export function createRecord<T>(
  table: string,
) {
  return async (data: Partial<T>): Promise<T | null> => {
    const { data: result, error } = await supabase
      .from(table)
      .insert([data])
      .select()
      .single();
    if (error) {
      logError(`create ${table}`, error);
      return null;
    }
    return result as T;
  };
}

export function updateRecord<T>(
  table: string,
  idField = 'id'
) {
  return async (id: string | number, updates: Partial<T>): Promise<T | null> => {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq(idField, id)
      .select()
      .single();
    if (error) {
      logError(`update ${table}`, error, id);
      return null;
    }
    return data as T;
  };
}

export function deleteRecord<T>(
  table: string,
  idField = 'id'
) {
  return async (id: string | number): Promise<T | null> => {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq(idField, id)
      .select()
      .single();
    if (error) {
      logError(`delete ${table}`, error, id);
      return null;
    }
    return data as T;
  };
}

export function findRecordById<T>(
  table: string,
  idField = 'id'
) {
  return async (id: string | number): Promise<T | null> => {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(idField, id)
      .single();
    if (error) {
      if (error.code !== 'PGRST116') logError(`find ${table} by ${idField}`, error, id);
      return null;
    }
    return data as T;
  };
}

export function countRecords(
  table: string,
) {
  return async (filters?: Record<string, any>): Promise<number> => {
    let query = supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
    }
    const { count, error } = await query;
    if (error) {
      logError(`count ${table}`, error);
      return 0;
    }
    return count || 0;
  };
}
