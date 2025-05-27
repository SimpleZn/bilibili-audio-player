/**
 * Bilibili API utilities for extracting audio URLs from video pages
 */
import { BilibiliVideoInfo, AuthConfig } from './types'; // Import shared types

/**
 * Extract video ID (BV or AV) from Bilibili URL
 * @param url Bilibili video URL
 * @returns Video ID object containing aid, bvid, or null if not found
 */
export const extractVideoId = (url: string): { aid?: string; bvid?: string } | null => {
  // Match BV ID pattern
  const bvMatch = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
  if (bvMatch && bvMatch[1]) {
    return { bvid: bvMatch[1] };
  }

  // Match AV ID pattern
  const avMatch = url.match(/\/video\/av(\d+)/);
  if (avMatch && avMatch[1]) {
    return { aid: avMatch[1] };
  }

  // Match short URL pattern
  const shortMatch = url.match(/bilibili\.com\/([a-zA-Z0-9]+)/);
  if (shortMatch && shortMatch[1] && !shortMatch[1].includes('/')) {
    // Assuming it's a BV ID if it's not a path
    if (shortMatch[1].startsWith('BV')) {
      return { bvid: shortMatch[1] };
    } else if (shortMatch[1].startsWith('av')) {
      return { aid: shortMatch[1].substring(2) };
    }
  }

  return null;
};

/**
 * Fetch video information including CID from Bilibili API
 * @param videoId Video ID object containing aid or bvid
 * @param authConfig Authentication configuration
 * @returns Promise resolving to video info or null if failed
 */
export const fetchVideoInfo = async (
  videoId: { aid?: string; bvid?: string },
  authConfig?: AuthConfig
): Promise<{ title: string; cid: string; bvid: string; aid: string } | null> => {
  try {
    const params = new URLSearchParams();
    if (videoId.bvid) {
      params.append('bvid', videoId.bvid);
    } else if (videoId.aid) {
      params.append('aid', videoId.aid);
    } else {
      throw new Error('Invalid video ID');
    }

    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    };

    // Add SESSDATA cookie if provided
    if (authConfig?.SESSDATA) {
      headers.Cookie = `SESSDATA=${authConfig.SESSDATA}`;
    }

    const response = await fetch(`https://api.bilibili.com/x/web-interface/view?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    
    if (data.code === 0 && data.data) {
      return {
        title: data.data.title,
        cid: data.data.cid,
        bvid: data.data.bvid,
        aid: data.data.aid,
      };
    }
    
    throw new Error(`API error: ${data.message || 'Unknown error'}`);
  } catch (error) {
    console.error('Error fetching video info:', error);
    return null;
  }
};

/**
 * Extract audio URL from Bilibili video
 * @param videoInfo Video information containing aid, bvid, and cid
 * @param authConfig Authentication configuration
 * @returns Promise resolving to audio URL or null if failed
 */
export const extractAudioUrl = async (
  videoInfo: { aid: string; bvid: string; cid: string },
  authConfig?: AuthConfig
): Promise<string | null> => {
  try {
    const params = new URLSearchParams({
      avid: videoInfo.aid,
      cid: videoInfo.cid,
      qn: '0',
      fnval: '16',
      fnver: '0',
      fourk: '1',
    });

    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Referer': 'https://www.bilibili.com',
    };

    // Add SESSDATA cookie if provided
    if (authConfig?.SESSDATA) {
      headers.Cookie = `SESSDATA=${authConfig.SESSDATA}`;
    }

    const response = await fetch(`https://api.bilibili.com/x/player/playurl?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    
    if (data.code === 0 && data.data) {
      // Look for audio stream in dash format
      if (data.data.dash && data.data.dash.audio && data.data.dash.audio.length > 0) {
        // Get the highest quality audio
        const audioStreams = data.data.dash.audio;
        audioStreams.sort((a: any, b: any) => b.bandwidth - a.bandwidth);
        return audioStreams[0].baseUrl || audioStreams[0].base_url;
      }
      
      // Fallback to legacy format if dash is not available
      if (data.data.durl && data.data.durl.length > 0) {
        return data.data.durl[0].url;
      }
    }
    
    throw new Error(`API error: ${data.message || 'No audio stream found'}`);
  } catch (error) {
    console.error('Error extracting audio URL:', error);
    return null;
  }
};

/**
 * Complete process to get audio URL from Bilibili video URL
 * @param url Bilibili video URL
 * @param authConfig Authentication configuration
 * @returns Promise resolving to complete video info with audio URL or null if failed
 */
export const getBilibiliAudio = async (
  url: string,
  authConfig?: AuthConfig
): Promise<BilibiliVideoInfo | null> => {
  try {
    // Extract video ID from URL
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid Bilibili URL');
    }

    // Fetch video info to get CID
    const videoInfo = await fetchVideoInfo(videoId, authConfig);
    if (!videoInfo) {
      throw new Error('Failed to fetch video info');
    }

    // Extract audio URL
    const audioUrl = await extractAudioUrl(videoInfo, authConfig);
    if (!audioUrl) {
      throw new Error('Failed to extract audio URL');
    }

    return {
      title: videoInfo.title,
      aid: videoInfo.aid,
      bvid: videoInfo.bvid,
      cid: videoInfo.cid,
      audioUrl,
    };
  } catch (error) {
    console.error('Error in getBilibiliAudio:', error);
    return null;
  }
};

/**
 * Check if current tab is a Bilibili video page
 * @param url Current tab URL
 * @returns Boolean indicating if URL is a Bilibili video page
 */
export const isBilibiliVideoPage = (url: string): boolean => {
  return /bilibili\.com\/video\/(av\d+|BV[a-zA-Z0-9]+)/.test(url);
};

/**
 * Save authentication configuration to Chrome storage
 * @param authConfig Authentication configuration
 * @returns Promise resolving when save is complete
 */
export const saveAuthConfig = async (authConfig: AuthConfig): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ authConfig }, resolve);
  });
};

/**
 * Load authentication configuration from Chrome storage
 * @returns Promise resolving to authentication configuration or empty object if not found
 */
export const loadAuthConfig = async (): Promise<AuthConfig> => {
  return new Promise((resolve) => {
    chrome.storage.sync.get('authConfig', (result) => {
      resolve((result.authConfig as AuthConfig) || { SESSDATA: '' });
    });
  });
};
