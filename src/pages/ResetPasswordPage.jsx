import React, { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, MapPin, Moon, ShieldAlert, Sun } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';

export default function ResetPasswordPage({ setActiveTab, darkMode, setDarkMode }) {
  const { configured, authLoading, user, isRecoverySession, validateRecoverySession, updatePassword, signOut, clearRecoverySession } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recoveryValid, setRecoveryValid] = useState(null);

  useEffect(() => {
    let active = true;
    if (authLoading) return () => { active = false; };
    if (!configured || !user || !isRecoverySession) { setRecoveryValid(false); return () => { active = false; }; }
    setRecoveryValid(null);
    validateRecoverySession().then((valid) => { if (active) setRecoveryValid(valid); }).catch(() => { if (active) setRecoveryValid(false); });
    return () => { active = false; };
  }, [authLoading, configured, user?.id, isRecoverySession, validateRecoverySession]);

  const fieldClass = (invalid) => `w-full rounded-xl border ${invalid ? 'border-rose-400 focus:ring-rose-100' : 'border-stone-200 focus:border-teal-600 focus:ring-teal-100'} bg-white dark:bg-[#171717] px-4 py-3 text-sm text-stone-900 dark:text-slate-100 outline-none focus:ring-4 transition`;
  const submit = async (event) => {
    event.preventDefault();
    setErrors({}); setNotice('');
    if (recoveryValid !== true || !isRecoverySession) { setRecoveryValid(false); return; }
    const nextErrors = {};
    if (!password) nextErrors.password = 'Enter a new password.';
    else if (password.length < 8) nextErrors.password = 'Use at least 8 characters.';
    if (!confirm) nextErrors.confirm = 'Confirm your new password.';
    else if (password !== confirm) nextErrors.confirm = 'Passwords do not match.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSubmitting(true);
    try {
      // Recheck the live Supabase user immediately before changing credentials.
      if (!(await validateRecoverySession())) { setRecoveryValid(false); return; }
      const { error } = await updatePassword(password);
      if (error) throw error;
      setPassword(''); setConfirm('');
      setSuccess(true);
      setNotice('Your password has been updated. Taking you back to login…');
      clearRecoverySession();
      try { await signOut(); } catch { /* the recovery marker is cleared even if sign-out cannot reach Supabase */ }
      window.setTimeout(() => setActiveTab('sign-in'), 1800);
    } catch {
      setNotice('We could not update your password. The reset link may have expired; request a new one and try again.');
    } finally { setSubmitting(false); }
  };

  return <main className="auth-page flex min-h-screen flex-col items-center justify-center bg-[#f5f8f5] dark:bg-[#050505] px-4 py-8 sm:py-12">
    <div className="w-full max-w-md">
      <div className="mb-6 flex items-center justify-between gap-3"><button type="button" onClick={() => setActiveTab('sign-in')} className="inline-flex items-center gap-2 rounded text-sm font-semibold text-stone-600 dark:text-slate-300 hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700"><ArrowLeft className="h-4 w-4" /> Back to login</button><button type="button" onClick={() => setDarkMode(!darkMode)} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={darkMode} className="rounded-xl border border-stone-200 bg-white p-2.5 text-stone-600 dark:border-[#303030] dark:bg-[#111111] dark:text-slate-200">{darkMode ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}</button></div>
      <section className="rounded-3xl border border-stone-200 bg-white dark:border-[#2b2b2b] dark:bg-[#111111] p-6 shadow-xl shadow-emerald-950/5 sm:p-9">
        <div className="mb-7 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-800 text-white"><MapPin className="h-6 w-6" aria-hidden="true" /></div><div><div className="text-lg font-extrabold text-stone-900">ResiliMap</div><div className="text-xs text-stone-500">Map Today. Prepare for Tomorrow.</div><div className="text-[10px] text-stone-400">Community-Powered Climate Resilience Platform</div></div></div>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Reset your password</h1>
        {authLoading || recoveryValid === null ? <p role="status" className="mt-3 text-sm text-stone-500">Verifying your password-reset link…</p> : !recoveryValid ? <div className="mt-4 space-y-4"><p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm leading-relaxed text-amber-900">This password-reset link is invalid, expired, or has already been used. Request a new link to continue.</p><button type="button" onClick={() => setActiveTab('forgot-password')} className="flex w-full items-center justify-center rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Request another reset link</button><div className="text-center text-sm"><button type="button" onClick={() => setActiveTab('sign-in')} className="font-bold text-teal-800 hover:underline">Return to login</button></div></div> : success ? <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm leading-relaxed text-emerald-900">{notice}</div> : <>
          <p className="mt-1 text-sm text-stone-500">Choose a new password with at least 8 characters.</p>
          <form className="mt-7 space-y-4" onSubmit={submit} noValidate>
            <div><label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold text-stone-700">New password</label><div className="relative"><LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" /><input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={`${fieldClass(errors.password)} pl-10 pr-12`} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'new-password-error' : undefined} /><button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide new password' : 'Show new password'} aria-pressed={showPassword} className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-stone-500 hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">{showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}</button></div>{errors.password && <p id="new-password-error" className="mt-1 text-xs text-rose-700">{errors.password}</p>}</div>
            <div><label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold text-stone-700">Confirm new password</label><div className="relative"><input id="confirm-password" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className={`${fieldClass(errors.confirm)} pr-12`} aria-invalid={Boolean(errors.confirm)} aria-describedby={errors.confirm ? 'confirm-password-error' : undefined} /><button type="button" onClick={() => setShowConfirm((shown) => !shown)} aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'} aria-pressed={showConfirm} className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-stone-500 hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">{showConfirm ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}</button></div>{errors.confirm && <p id="confirm-password-error" className="mt-1 text-xs text-rose-700">{errors.confirm}</p>}</div>
            {notice && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm leading-relaxed text-rose-900">{notice}</p>}
            <button type="submit" disabled={submitting || recoveryValid !== true} className="flex w-full items-center justify-center rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">{submitting ? 'Updating password…' : 'Reset Password'}</button>
          </form>
          <div className="mt-6 text-center text-sm text-stone-600"><button type="button" onClick={() => setActiveTab('sign-in')} className="font-bold text-teal-800 hover:underline">Return to login</button></div>
        </>}
      </section>
      <p className="mt-5 flex items-start justify-center gap-2 px-2 text-center text-xs leading-relaxed text-stone-500"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> Passwords are sent directly to Supabase Auth and are never logged by this app.</p>
    </div>
  </main>;
}
