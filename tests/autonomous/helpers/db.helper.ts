/**
 * PoDM Autonomous QA Test Suite — Database Helper
 * Uses Supabase Service Role client to seed, query, and verify live database state
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

export class DbHelper {
  private static instance: SupabaseClient | null = null;

  public static getClient(): SupabaseClient {
    if (!this.instance) {
      // Load environment variables from PoDM_project/.env if needed
      dotenv.config({ path: path.resolve(__dirname, '../../../PoDM_project/.env') });

      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

      if (!supabaseUrl || !supabaseKey) {
        console.warn('⚠️ Supabase credentials missing from environment. DB helper will operate in fallback mode.');
      }

      this.instance = createClient(supabaseUrl, supabaseKey);
    }
    return this.instance;
  }

  public static async getProfile(userId: string) {
    const { data, error } = await this.getClient().from('profiles').select('*').eq('id', userId).single();
    if (error) return null;
    return data;
  }

  public static async deleteProfile(userId: string) {
    await this.getClient().from('profiles').delete().eq('id', userId);
  }

  public static async deleteAuthUser(userId: string) {
    try {
      await this.getClient().auth.admin.deleteUser(userId);
    } catch {
      // Ignore if auth user doesn't exist
    }
  }

  public static async createSubscriptionRecord(subscription: {
    fan_id: string;
    creator_id: string;
    tier_id?: string;
    status: string;
  }) {
    const { data, error } = await this.getClient().from('subscriptions').insert(subscription).select().single();
    if (error) throw error;
    return data;
  }

  public static async deleteSubscriptionRecord(id: string) {
    await this.getClient().from('subscriptions').delete().eq('id', id);
  }

  public static async getCryptoPayment(txHash: string) {
    const { data } = await this.getClient()
      .from('crypto_payments')
      .select('*')
      .eq('blockchain_tx_hash', txHash)
      .single();
    return data;
  }

  public static async cleanupTestUser(email: string) {
    const client = this.getClient();
    const { data: profile } = await client.from('profiles').select('id').eq('email', email).maybeSingle();
    if (profile?.id) {
      await client.from('subscriptions').delete().eq('fan_id', profile.id);
      await client.from('subscriptions').delete().eq('creator_id', profile.id);
      await client.from('content').delete().eq('creator_id', profile.id);
      await client.from('profiles').delete().eq('id', profile.id);
      await this.deleteAuthUser(profile.id);
    }
  }
}
