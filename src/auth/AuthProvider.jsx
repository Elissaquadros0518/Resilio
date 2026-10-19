import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileStatus, setProfileStatus] = useState('idle');
  const profileRequest = useRef(0);

  const loadProfile = useCallback(async (userId) => {
    const requestId = ++profileRequest.current;
    if (!supabase || !userId) {
      setProfile(null); setProfileError(null); setProfileLoading(false); setProfileStatus('missing');
      return { data: null, error: null, missing: true };
    }
    setProfile(null); setProfileError(null); setProfileLoading(true); setProfileStatus('loading');
    try {
      const { data, error } = await supabase.from('profiles')
        .select('id, display_name, role, created_at, updated_at')
        .eq('id', userId).maybeSingle();
      if (requestId !== profileRequest.current) return { data: null, error: null, stale: true };
      if (error) {
        setProfileError(error); setProfileStatus('error');
        return { data: null, error, missing: false };
      }
      if (data && data.id !== userId) {
        const profileError = new Error('The loaded profile does not match the authenticated account.');
        setProfileError(profileError); setProfileStatus('error');
        return { data: null, error: profileError, missing: false };
      }
      setProfile(data);
      setProfileStatus(data ? 'ready' : 'missing');
      return { data, error: null, missing: !data };
    } catch (error) {
      if (requestId === profileRequest.current) { setProfileError(error); setProfileStatus('error'); }
      return { data: null, error, missing: false };
    } finally {
      if (requestId === profileRequest.current) setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); setProfileStatus('unconfigured'); return undefined; }
    let alive = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!alive) return;
      const current = error ? null : data.session;
      setSession(current);
      if (current?.user) await loadProfile(current.user.id);
      else { profileRequest.current += 1; setProfile(null); setProfileStatus('idle'); }
      if (alive) setAuthLoading(false);
    }).catch((error) => {
      if (alive) { setAuthLoading(false); setProfileError(error); setProfileStatus('error'); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        // Defer API work outside the auth callback to avoid holding its internal lock.
        setAuthLoading(false);
        Promise.resolve().then(() => loadProfile(nextSession.user.id));
      } else {
        profileRequest.current += 1;
        setProfile(null); setProfileError(null); setProfileLoading(false); setProfileStatus('idle');
        setAuthLoading(false);
      }
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [loadProfile]);

  const signIn = useCallback((email, password) => supabase.auth.signInWithPassword({ email, password }), []);
  const signUp = useCallback((email, password, displayName) => supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName }, emailRedirectTo: window.location.origin },
  }), []);
  const signOut = useCallback(() => supabase.auth.signOut(), []);
  const resetPassword = useCallback((email) => supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/?tab=reset-password`,
  }), []);
  const updatePassword = useCallback((password) => supabase.auth.updateUser({ password }), []);
  const refreshProfile = useCallback((userId = session?.user?.id) => (
    userId ? loadProfile(userId) : Promise.resolve({ data: null, error: null, missing: true })
  ), [session, loadProfile]);
  const updateProfile = useCallback(async (displayName) => {
    if (!session?.user) return { error: new Error('You must be signed in.') };
    if (profileStatus !== 'ready' || !profile) return { error: profileError || new Error('Your profile is unavailable. Refresh it before making changes.') };
    try {
      const { data, error } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', session.user.id).select('id, display_name, role, created_at, updated_at').single();
      if (!error) { setProfile(data); setProfileStatus('ready'); setProfileError(null); }
      return { data, error };
    } catch (error) { return { data: null, error }; }
  }, [session, profileStatus, profile, profileError]);

  const value = useMemo(() => ({
    configured: isSupabaseConfigured, authLoading, profileLoading, profileError, profileStatus, session, user: session?.user ?? null, profile,
    role: profile?.role ?? null, signIn, signUp, signOut, resetPassword, updatePassword, updateProfile,
    refreshProfile,
  }), [authLoading, profileLoading, profileError, profileStatus, session, profile, signIn, signUp, signOut, resetPassword, updatePassword, updateProfile, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
