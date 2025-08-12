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

/**
 * The base User interface, representing the core data for any user.
 */
export interface User {
  _id: string; // Unique identifier from the database
  username: string;
  email: string;
  passwordHash: string; // This should only ever exist on the backend
  profile: UserProfile;
  role: UserRole;
  status: UserStatus;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
}

