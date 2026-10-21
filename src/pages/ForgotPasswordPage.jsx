import React, { useRef, useState } from 'react';
import { ArrowLeft, Mail, MapPin, Moon, ShieldAlert, Sun } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage({ setActiveTab, darkMode, setDarkMode }) {
  const { configured, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestInFlight = useRef(false);
  const submit = async (event) => {
    event.preventDefault();
    if (requestInFlight.current) return;
    setError(''); setNotice('');
    const cleanEmail = email.trim();
    if (!cleanEmail) { setError('Enter your email address.'); return; }
    if (!emailPattern.test(cleanEmail)) { setError('Enter a valid email address.'); return; }
    if (!configured) { setError('Password recovery is unavailable because Supabase is not configured.'); return; }
    requestInFlight.current = true;
    setSubmitting(true);
    try {
      const { error: requestError } = await resetPassword(cleanEmail);
      if (requestError) throw requestError;
      setNotice('If an account exists for this email address, you will receive a password-reset link shortly. Please check your inbox and spam folder.');
    } catch (requestError) {
      const rateLimited = requestError?.status === 429 || ['over_email_send_rate_limit', 'over_request_rate_limit'].includes(requestError?.code);
      setError(rateLimited
        ? 'Reset requests are temporarily rate-limited. If you recently requested a link, check your inbox and spam folder. Please wait before trying again.'
        : 'We could not process that request right now. Please try again shortly.');
    } finally { requestInFlight.current = false; setSubmitting(false); }
  };
  const fieldClass = `w-full rounded-xl border ${error ? 'border-rose-400 focus:ring-rose-100' : 'border-stone-200 focus:border-teal-600 focus:ring-teal-100'} bg-white dark:bg-[#171717] px-4 py-3 text-sm text-stone-900 dark:text-slate-100 outline-none focus:ring-4 transition`;
  return <main className="auth-page flex min-h-screen flex-col items-center justify-center bg-[#f5f8f5] dark:bg-[#050505] px-4 py-8 sm:py-12">
    <div className="w-full max-w-md">
      <div className="mb-6 flex items-center justify-between gap-3">
        <button type="button" onClick={() => setActiveTab('sign-in')} className="inline-flex items-center gap-2 rounded text-sm font-semibold text-stone-600 dark:text-slate-300 hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700"><ArrowLeft className="h-4 w-4" /> Back to login</button>
        <button type="button" onClick={() => setDarkMode(!darkMode)} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={darkMode} className="rounded-xl border border-stone-200 bg-white p-2.5 text-stone-600 dark:border-[#303030] dark:bg-[#111111] dark:text-slate-200">{darkMode ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}</button>
      </div>
      <section className="rounded-3xl border border-stone-200 bg-white dark:border-[#2b2b2b] dark:bg-[#111111] p-6 shadow-xl shadow-emerald-950/5 sm:p-9">
        <div className="mb-7 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-800 text-white"><MapPin className="h-6 w-6" aria-hidden="true" /></div><div><div className="text-lg font-extrabold text-stone-900">ResiliMap</div><div className="text-xs text-stone-500">Map Today. Prepare for Tomorrow.</div><div className="text-[10px] text-stone-400">Community-Powered Climate Resilience Platform</div></div></div>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Forgot your password?</h1>
        <p className="mt-1 text-sm text-stone-500">Enter the email address for your account and we’ll send a password-reset link.</p>
        <form className="mt-7 space-y-4" onSubmit={submit} noValidate>
          <div><label htmlFor="recovery-email" className="mb-1.5 block text-sm font-semibold text-stone-700">Email address</label><div className="relative"><Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" /><input id="recovery-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={`${fieldClass} pl-10`} placeholder="you@example.com" aria-invalid={Boolean(error)} aria-describedby={error ? 'recovery-error' : undefined} /></div>{error && <p id="recovery-error" className="mt-1 text-xs text-rose-700" role="alert">{error}</p>}</div>
          {notice && <div role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-sm leading-relaxed text-sky-900">{notice}</div>}
          <button type="submit" disabled={submitting} className="flex w-full items-center justify-center rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">{submitting ? 'Sending reset link…' : 'Send Reset Link'}</button>
        </form>
        <div className="mt-6 text-center text-sm text-stone-600">Remembered it? <button type="button" onClick={() => setActiveTab('sign-in')} className="font-bold text-teal-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">Return to login</button></div>
      </section>
      <p className="mt-5 flex items-start justify-center gap-2 px-2 text-center text-xs leading-relaxed text-stone-500"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> Your account details stay private. This page does not confirm whether an email is registered.</p>
    </div>
  </main>;
}
