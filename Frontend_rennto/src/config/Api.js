import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Explicit override. Set EXPO_PUBLIC_API_URL in .env to point the app at a
// specific backend (e.g. a teammate's machine). Requires `npx expo start -c`
// after any change, because Expo inlines EXPO_PUBLIC_* at bundle time.
const ENV_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const getDevBaseUrl = () => {
  // 1. Explicit override always wins.
  if (ENV_BASE_URL) {
    return ENV_BASE_URL.replace(/\/+$/, '');
  }

  // 2. Otherwise assume the backend runs on the same machine as Metro.
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost') {
      return `http://${ip}:8000`;
    }
  }

  // 3. Android emulator loopback to the host machine.
  if (Platform.OS === 'android' && !hostUri) {
    return 'http://10.0.2.2:8000';
  }

  return 'http://localhost:8000';
};

export const BASE_URL = __DEV__
  ? getDevBaseUrl()
  : "https://api.rennto.in";

if (__DEV__) {
  // console.log is globally disabled in App.js; warn survives.
  console.warn(
    `[API] BASE_URL = ${BASE_URL}` +
    (ENV_BASE_URL ? ' (from EXPO_PUBLIC_API_URL)' : ' (auto-detected from Metro host)')
  );
}

export const WS_BASE_URL = BASE_URL
  .replace("http://", "ws://")
  .replace("https://", "wss://");

export const fetchWithAuth = async (url, options = {}) => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    const selectedAccountId = await AsyncStorage.getItem("selectedAccountId");
    const headers = { ...(options.headers || {}) };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (selectedAccountId) {
      headers["X-Owner-Account-ID"] = selectedAccountId;
    }

    // Determine if the body is FormData (React Native's FormData has _parts)
    const isFormData = options.body && (options.body instanceof FormData || options.body._parts);

    if (isFormData) {
      // 1. DO NOT force Content-Type: application/json
      // 2. DO NOT manually set multipart boundary
      // Let React Native/Expo automatically generate the multipart/form-data boundary.
      if (headers['Content-Type']) {
        delete headers['Content-Type'];
      }
      // 4. Preserve the FormData object exactly. (Do nothing to options.body)
    } else if (options.body && typeof options.body === 'object') {
      // Normal JSON API requests
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      options.body = JSON.stringify(options.body);
    }

    const config = { ...options, headers };
    const { apiFetch } = require('../utils/ApiWrapper');

    // Expo's fetch polyfill (winter/fetch) crashes with "Unsupported FormDataPart implementation"
    // when using standard React Native { uri, name, type } file uploads. 
    // To bypass this, we force FormData to use XMLHttpRequest, which relies on the
    // robust React Native C++/Java NetworkingModule natively.
    let finalFetch = fetch;
    if (isFormData) {
      finalFetch = (fetchUrl, fetchOptions) => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(fetchOptions.method || 'POST', fetchUrl);

          if (fetchOptions.headers) {
            Object.entries(fetchOptions.headers).forEach(([k, v]) => {
              xhr.setRequestHeader(k, v);
            });
          }

          xhr.onload = () => {
            resolve({
              ok: xhr.status >= 200 && xhr.status < 300,
              status: xhr.status,
              json: async () => JSON.parse(xhr.responseText),
              text: async () => xhr.responseText,
              clone: function () { return this; }
            });
          };

          xhr.onerror = () => {
            reject(new Error('Network request failed'));
          };

          xhr.send(fetchOptions.body);
        });
      };
    }

    const response = await apiFetch(url, config, finalFetch);

    // Intercept 503 Maintenance Mode and return empty data gracefully
    if (response.status === 503) {
      try {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        if (data.maintenance_mode === 'FULL_MAINTENANCE' || data.maintenance_mode === 'READ_ONLY') {
          if (global.triggerMaintenanceCheck) {
            global.triggerMaintenanceCheck();
          }
          return new Response(
            JSON.stringify({
              success: true,
              data: [],
              message: data.message || "Maintenance Mode"
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      } catch (e) {
        console.log("Error checking maintenance mode", e);
      }
    }

    return response;
  } catch (error) {
    throw error;
  }
};

export default BASE_URL;
