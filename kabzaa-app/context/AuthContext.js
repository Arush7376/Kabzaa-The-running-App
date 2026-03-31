import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../services/api';

const USERNAME_KEY = '@kabzaa_username';

const AuthContext = createContext(null);

async function readStoredSession() {
  const entries = await AsyncStorage.multiGet([api.TOKEN_KEY, USERNAME_KEY]);
  return {
    token: entries[0]?.[1] || null,
    username: entries[1]?.[1] || null,
  };
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const session = await readStoredSession();
        if (!active) {
          return;
        }

        setToken(session.token);
        setUsername(session.username);
      } finally {
        if (active) {
          setBooting(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const persistSession = useCallback(async (nextToken, nextUsername) => {
    await AsyncStorage.multiSet([
      [api.TOKEN_KEY, nextToken],
      [USERNAME_KEY, nextUsername],
    ]);
    setToken(nextToken);
    setUsername(nextUsername);
  }, []);

  const signIn = useCallback(
    async (user, password) => {
      const data = await api.loginUser(user, password);
      await persistSession(data.token, data.username || user);
      return data;
    },
    [persistSession],
  );

  const signUp = useCallback(async (user, email, password) => {
    const data = await api.registerUser(user, email, password);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove([api.TOKEN_KEY, USERNAME_KEY]);
    setToken(null);
    setUsername(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      username,
      booting,
      signIn,
      signUp,
      signOut,
    }),
    [booting, signIn, signOut, signUp, token, username],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
