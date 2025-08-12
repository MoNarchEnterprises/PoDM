// /common/types/Gallery.ts

/**
 * Defines the structure for a single item that a fan has saved to their gallery.
 */
export interface GalleryItem {
  contentId: string; // The ID of the Content object
  addedDate: string; // ISO 8601 date string of when the content was added
  isAccessible: boolean; // Determines if the fan can still view the content (based on subscription status)
}

/**
 * The main Gallery interface, representing a fan's collection of saved content.
 */
export interface Gallery {
  _id: string; // Unique identifier for the gallery itself
  fanId: string; // The ID of the user who owns this gallery
  content: GalleryItem[]; // An array of all content items saved by the fan
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
}
