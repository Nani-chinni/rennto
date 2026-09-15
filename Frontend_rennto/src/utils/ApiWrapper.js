import NetInfo from '@react-native-community/netinfo';
import { getCache, saveCache } from './CacheHelper';
import { showOfflineAlert } from './OfflineAlert';

// Create a custom mock response object mimicking standard Response interface
const makeMockResponse = (data, status = 200) => {
  return {
    ok: status >= 200 && status < 300,
    status: status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: {
      get: (headerName) => {
        if (headerName.toLowerCase() === 'content-type') return 'application/json';
        return null;
      }
    },
    clone: function() { return this; }
  };
};

export const apiFetch = async (url, options = {}, originalFetch) => {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  // A caller can opt one GET out of the response cache with { noCache: true }.
  // Used by the notification unread count, where replaying an old response --
  // possibly the previous account's -- is worse than returning nothing. Every
  // other GET caches exactly as before.
  const useCache = isGet && options.noCache !== true;

  // Check network state
  const networkState = await NetInfo.fetch();
  const isOnline = networkState.isConnected !== false;

  if (!isOnline) {
    if (isGet) {
      // Fetch from AsyncStorage cache
      const cachedData = useCache ? await getCache(url) : null;
      if (cachedData !== null) {
        return makeMockResponse(cachedData, 200);
      }
      // Cache miss - return mock 503 response
      return makeMockResponse({ error: "No internet connection and no cached data available.", cache_miss: true }, 503);
    } else {
      // Mutation blocked when offline
      showOfflineAlert();
      throw new Error("Internet connection is required for this action.");
    }
  }

  // If online, perform the actual fetch
  try {
    const response = await originalFetch(url, options);

    // Save successful GET response to cache
    if (useCache && response.ok) {
      try {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        if (data) {
          await saveCache(url, data);
        }
      } catch {
        // Response was not JSON, ignore cache save
      }
    }

    return response;
  } catch (error) {
    // If request fails due to network error and it's a GET, try to fall back to cache
    if (useCache) {
      const cachedData = await getCache(url);
      if (cachedData !== null) {
        return makeMockResponse(cachedData, 200);
      }
    }
    throw error;
  }
};

export default {
  apiFetch
};
