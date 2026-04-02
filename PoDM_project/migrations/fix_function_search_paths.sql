-- Migration: Fix Function Search Paths
-- Description: Sets search_path explicitly on functions to satisfy Supabase security linter

ALTER FUNCTION public.update_referrals_updated_at SET search_path = public;
ALTER FUNCTION public.increment_ppv_earnings SET search_path = public;
ALTER FUNCTION public.aggregate_monthly_logs SET search_path = public;
ALTER FUNCTION public.get_all_users_details SET search_path = public;
ALTER FUNCTION public.get_creator_conversations_sorted SET search_path = public;
ALTER FUNCTION public.get_creator_subscribers_for_messaging SET search_path = public;
ALTER FUNCTION public.get_user_details SET search_path = public;
ALTER FUNCTION public.increment_content_view_count SET search_path = public;
ALTER FUNCTION public.increment_gallery_add_count SET search_path = public;
ALTER FUNCTION public.increment_tip_count SET search_path = public;
