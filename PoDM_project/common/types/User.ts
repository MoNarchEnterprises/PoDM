// /common/types/User.ts

/**
 * Defines the possible roles a user can have on the platform.
 */
export type UserRole = 'fan' | 'creator' | 'admin';

/**
 * Defines the possible statuses for a user account.
 */
export type UserStatus = 'active' | 'suspended' | 'banned' | 'pending' | 'pending verification';

/**
 * Defines the structure for a user's social media links.
 */
export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  tiktok?: string;
}

/**
 * Defines the structure for a user's public-facing profile information.
 */
export interface UserProfile {
  name: string;
  avatar: string; // URL to the avatar image
  bio?: string; // Optional for fans, required for creators
  socialLinks?: SocialLinks;
}

// Add this new interface to describe the shape of the verification data
export interface VerificationData {
  signature: string;
  idFilePath: string;
  selfieFilePath: string;
  submittedAt: string;
}

/**
 * The base User interface, representing the core data for any user.
 */
export interface User {
  id: string; // Unique identifier from the database (Supabase uses 'id')
  username: string;
  email: string;
  profile: UserProfile;
  role: UserRole;
  status: UserStatus;
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
  verification_data?: VerificationData;
  creator_data?: any; // JSONB column
  preferences?: any; // JSONB column
  onboarding_complete?: boolean; // Whether the user has completed onboarding
  is_enclave_member?: boolean; // Whether the user is an Enclave member (locked at ENCLAVE_COMMISSION_RATE)
  crypto_wallet_address?: string; // User's linked crypto wallet address
  smart_account_address?: string;
  wallet_provider?: string;
  wallet_status?: string;
  crypto_wallet_type?: string;
  crypto_wallet_provider_id?: string;
}
