/**
 * Bilibili API utilities for extracting audio URLs from video pages
 */
import {
  BilibiliVideoInfo,
  AuthConfig,
  SignData,
  ViewApiResponseData, // Imported from types.ts
  PlayUrlApiResponseData, // Imported from types.ts
  BiliApiResponse,      // Imported from types.ts
} from './types'; 
import { encWbi, extractVideoId } from './util'; // extractVideoId imported from util.ts

const BILIBILI_API_BASE_URL = 'https://api.bilibili.com';

// Interfaces like ViewApiResponseData, DashAudioStream, etc., have been moved to types.ts
// Utility functions like extractVideoId, isBilibiliVideoPage, etc., have been moved to util.ts

async function makeSignedBiliApiRequest<T>(
  endpoint: string,
  params: Record<string, string>,
  authConfig?: AuthConfig
): Promise<T> {
  const { signData } = await initSignData(); 
  if (!signData) {
    throw new Error('Failed to get sign data for API request.');
  }

  const signedParamsObject = encWbi(params, signData.imgKey, signData.subKey);
  const signedParamsUrlString = new URLSearchParams(signedParamsObject).toString();

  const headers: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://www.bilibili.com',
  };

  if (authConfig?.SESSDATA) {
    headers.Cookie = `SESSDATA=${authConfig.SESSDATA}`;
  }

  const response = await fetch(`${BILIBILI_API_BASE_URL}${endpoint}?${signedParamsUrlString}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Bilibili API HTTP error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as BiliApiResponse<T>;

  if (data.code !== 0) {
    throw new Error(`Bilibili API error: ${data.code} - ${data.message || 'Unknown API error'}`);
  }
  if (!data.data) {
    throw new Error('Bilibili API error: No data returned.');
  }
  return data.data;
}

function parseSignData(json: any): SignData {  
  const imgUrl = json.data.wbi_img.img_url;  
  const subUrl = json.data.wbi_img.sub_url;  
    
  const imgKey = imgUrl.substring(imgUrl.lastIndexOf('/') + 1, imgUrl.lastIndexOf('.'));  
  const subKey = subUrl.substring(subUrl.lastIndexOf('/') + 1, subUrl.lastIndexOf('.'));  
    
  return {  
    imgKey: imgKey,  
    subKey: subKey  
  };  
}

async function getSignData() {  
  const headers: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://www.bilibili.com',
  };
  const response = await fetch(`${BILIBILI_API_BASE_URL}/x/web-interface/nav`, { 
    method: 'GET',  
    headers
  });  
  
  if (response.ok) {  
    const data = await response.json();  
    return parseSignData(data);  
  } else {  
    throw new Error(`获取签名秘钥失败: ${response.status}`);
  }  
}  

async function getSpiData() {  
  const headers: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://www.bilibili.com',
  };
  const response = await fetch(`${BILIBILI_API_BASE_URL}/x/frontend/finger/spi`, { 
    method: 'GET',  
    headers
  });  
  
  if (!response.ok) {  
    throw new Error(`获取SPI数据失败: ${response.status}`);  
  }  
  
  const data = await response.json();  
  return {  
    b3: data.data.b_3,  
    b4: data.data.b_4  
  };  
}

export async function initSignData() {  
  const cachedData = await chrome.storage.local.get([  
    'signData',   
    'cacheTime',  
    'spiData'  
  ]);  
    
  const now = Date.now();  
  const oneDayInMs = 24 * 60 * 60 * 1000;  
    
  if (cachedData.signData &&   
      cachedData.cacheTime &&   
      cachedData.spiData &&  
      (now - cachedData.cacheTime) < oneDayInMs) {  
    console.log('使用缓存的签名数据');  
    return {  
      signData: cachedData.signData,  
      spiData: cachedData.spiData  
    };  
  }  
    
  console.log('缓存失效，重新获取签名数据');  
    
  try {  
    const [signData, spiData] = await Promise.all([  
      getSignData(),  
      getSpiData()  
    ]);  
      
    await chrome.storage.local.set({  
      signData: signData,  
      spiData: spiData,  
      cacheTime: now  
    });  
      
    console.log('签名数据获取成功并已缓存');  
    return { signData, spiData };  
      
  } catch (error) {  
    console.error('获取签名数据失败:', error);  
    throw error;  
  }  
}  

export async function sign(params: Record<string, string>) {
  const { signData } = await initSignData(); 
  if (signData) {
    return encWbi(params, signData.imgKey, signData.subKey);
  } else {
    console.error('Failed to get signData for signing parameters.');
    throw new Error('Authentication keys (signData) not available for signing.');
  }
}

export const fetchVideoInfo = async (
  videoId: { aid?: string; bvid?: string },
  authConfig?: AuthConfig
): Promise<{ title: string; cid: string; bvid: string; aid: string } | null> => {
  try {
    const params: Record<string, string> = {};
    if (videoId.bvid) {
      params.bvid = videoId.bvid;
    } else if (videoId.aid) {
      params.aid = videoId.aid;
    } else {
      console.error('Invalid video ID provided to fetchVideoInfo');
      return null; 
    }

    const data = await makeSignedBiliApiRequest<ViewApiResponseData>(
      '/x/web-interface/view',
      params,
      authConfig
    );

    return {
      title: data.title,
      cid: data.cid,
      bvid: data.bvid,
      aid: data.aid,
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    return null;
  }
};

export const extractAudioUrl = async (
  videoInfo: { aid: string; bvid: string; cid: string },
  authConfig?: AuthConfig
): Promise<string | null> => {
  try {
    const params: Record<string, string> = {
      avid: videoInfo.aid, 
      cid: videoInfo.cid,
      qn: '0', 
      fnval: '16', 
      fnver: '0',
      fourk: '1', 
    };

    const data = await makeSignedBiliApiRequest<PlayUrlApiResponseData>(
      '/x/player/wbi/playurl',
      params,
      authConfig
    );
    
    if (data.dash && data.dash.audio && data.dash.audio.length > 0) {
      const audioStreams = data.dash.audio;
      audioStreams.sort((a, b) => b.bandwidth - a.bandwidth);
      const bestAudio = audioStreams[0];
      return bestAudio.baseUrl || bestAudio.base_url || null; 
    }
      
    if (data.durl && data.durl.length > 0 && data.durl[0].url) {
      return data.durl[0].url;
    }
    
    console.warn('No audio stream found in API response for video:', videoInfo.bvid);
    return null; 
  } catch (error) {
    console.error('Error extracting audio URL:', error);
    return null;
  }
};

export const getBilibiliAudio = async (
  url: string,
  authConfig?: AuthConfig
): Promise<BilibiliVideoInfo | null> => {
  try {
    const videoId = extractVideoId(url); // Now imported from util.ts
    if (!videoId) {
      throw new Error('Invalid Bilibili URL');
    }

    const videoInfo = await fetchVideoInfo(videoId, authConfig);
    if (!videoInfo) {
      throw new Error('Failed to fetch video info');
    }

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

// extractVideoId, isBilibiliVideoPage, saveAuthConfig, loadAuthConfig functions
// have been moved to src/utils/util.ts
