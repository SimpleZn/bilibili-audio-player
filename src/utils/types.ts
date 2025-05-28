/**
 * Represents the comprehensive information for a Bilibili video, 
 * including a fresh audio URL.
 */
export interface BilibiliVideoInfo {
  title: string;
  aid: string;       // AV ID
  cid: string;       // Content ID (essential for playback, especially multi-part videos)
  bvid: string;      // BV ID (preferred identifier)
  audioUrl: string;  // Freshly fetched audio URL with expiry
}

/**
 * Authentication configuration, primarily SESSDATA.
 */
export interface AuthConfig {
  SESSDATA: string;
}

/**
 * Represents an item in the playback history.
 */
export interface HistoryItem {
  title: string;
  bvid: string;      // Bilibili Video ID (primary identifier)
  cid: string;       // Bilibili Content ID
  audioUrl?: string; // Optional: Stores the most recently fetched audio URL (mainly for quick display if very recent)
  timestamp: string;   // ISO string format for when it was last played
} 
export interface SignData {
  imgKey: string;
  subKey: string;
}