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

// API Response Data Structures

/**
 * Data structure for the /x/web-interface/view API endpoint response.
 */
export interface ViewApiResponseData {
  title: string;
  cid: string;
  bvid: string;
  aid: string;
  [key: string]: any; // Allow other properties not strictly typed here
}

/**
 * Represents a single audio stream in the DASH manifest.
 */
export interface DashAudioStream {
  id: number;
  baseUrl?: string;    // Preferred URL key
  base_url?: string;   // Alternative URL key used in some API versions
  bandwidth: number;   // Audio quality indicator (higher is better)
  [key: string]: any; // Allow other properties
}

/**
 * Represents the DASH data containing audio streams.
 */
export interface PlayUrlDashData {
  audio?: DashAudioStream[];
  [key: string]: any; // Allow other properties
}

/**
 * Represents a DURL (direct URL) item, a fallback for older API responses.
 */
export interface PlayUrlDurlData {
  url: string;
  [key: string]: any; // Allow other properties
}

/**
 * Data structure for the /x/player/wbi/playurl API endpoint response.
 */
export interface PlayUrlApiResponseData {
  dash?: PlayUrlDashData;
  durl?: PlayUrlDurlData[]; // Fallback for older formats
  [key: string]: any; // Allow other properties
}

/**
 * Generic wrapper for Bilibili API responses.
 * @template T The type of the actual data payload.
 */
export interface BiliApiResponse<T> {
  code: number;      // API response code (0 for success)
  message: string;   // API message
  data?: T;          // The actual data payload, type-parameterized
  ttl?: number;      // Time-to-live or other metadata
}