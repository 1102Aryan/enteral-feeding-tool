import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, getToken, setToken, setUnauthorizedHandler } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Clear the session locally and flag that it expired.
  const handleExpiry = useCallback(() => {
    setToken(null);
    setUser((u) => {
      if (u) setSessionExpired(true);
      return null;
    });
  }, []);

  // Any 401 on an authenticated request ends the session.
  useEffect(() => {
    setUnauthorizedHandler(handleExpiry);
    return () => setUnauthorizedHandler(null);
  }, [handleExpiry]);

  // Restore a session from a stored token on first load.
  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api.me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  // Poll so an expiry is caught and prompted even while idle.
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => { api.me().catch(() => {}); }, 60000);
    return () => clearInterval(id);
  }, [user]);

  const login = useCallback(async (username, password) => {
    const { token, user } = await api.login(username, password);
    setToken(token);
    setUser(user);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* revoke best-effort; clear locally regardless */
    }
    setToken(null);
    setUser(null);
    setSessionExpired(false);
  }, []);

  const can = useCallback(
    (permission) => {
      const perms = user?.permissions ?? [];
      return perms.includes("*") || perms.includes(permission);
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, ready, sessionExpired, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
