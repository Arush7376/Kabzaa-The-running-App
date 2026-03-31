import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const TOKEN_KEY = '@kabzaa_token';

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function resolveExpoHostUrl() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri;

  if (!hostUri || typeof hostUri !== 'string') {
    return null;
  }

  const host = hostUri.split(':')[0];
  return host ? `http://${host}:8000` : null;
}

export function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return stripTrailingSlash(envUrl);
  }

  const extraUrl = Constants.expoConfig?.extra?.apiUrl;
  if (extraUrl) {
    return stripTrailingSlash(extraUrl);
  }

  const expoHostUrl = resolveExpoHostUrl();
  if (expoHostUrl) {
    return expoHostUrl;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  return 'http://127.0.0.1:8000';
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 20000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export async function registerUser(username, email, password) {
  const { data } = await api.post('/api/auth/register/', {
    username,
    email: email || '',
    password,
  });
  return data;
}

export async function loginUser(username, password) {
  const { data } = await api.post('/api/auth/login/', {
    username,
    password,
  });
  return data;
}

export async function startRun() {
  const { data } = await api.post('/api/start-run/', {});
  return data;
}

export async function updateLocation(sessionId, latitude, longitude) {
  const { data } = await api.post('/api/update-location/', {
    session_id: sessionId,
    latitude,
    longitude,
  });
  return data;
}

export async function endRun(sessionId) {
  const { data } = await api.post('/api/end-run/', {
    session_id: sessionId,
  });
  return data;
}

export async function fetchProfile() {
  const { data } = await api.get('/api/profile/');
  return data;
}

export async function fetchRunHistory() {
  const { data } = await api.get('/api/run-history/');
  return data;
}

export async function fetchTerritory() {
  const { data } = await api.get('/api/territory/');
  return data;
}

export async function fetchLeaderboard() {
  const { data } = await api.get('/api/leaderboard/');
  return data;
}

export async function fetchChallenges() {
  const { data } = await api.get('/api/challenges/');
  return data;
}

export default api;
