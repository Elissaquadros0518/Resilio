import React, { useState } from 'react';
import { MapPin, ArrowLeft, Eye, EyeOff, LogIn, UserPlus, Mail, LockKeyhole, ShieldAlert, Sun, Moon } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';

const initialValues = { name: '', email: '', password: '', confirm: '' };
const getInitialView = () => new URLSearchParams(window.location.search).get('tab') === 'reset-password' ? 'reset' : 'signin';

export default function SignInPage({ setActiveTab, onAuthSuccess, darkMode, setDarkMode }) {
  const { configured, authLoading, user, signIn, signUp, resetPassword, updatePassword, refreshProfile } = useAuth();
  const [view, setView] = useState(getInitialView);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const update = (key) => (event) => setValues((previous) => ({ ...previous, [key]: event.target.value }));
  const changeView = (next) => { setView(next); setErrors({}); setNotice(''); setErrorMessage(''); };
  const fieldClass = (hasError) => `w-full rounded-xl border ${hasError ? 'border-rose-400 focus:ring-rose-100' : 'border-stone-200 focus:border-teal-600 focus:ring-teal-100'} bg-white dark:bg-[#171717] px-4 py-3 text-sm text-stone-900 dark:text-slate-100 outline-none focus:ring-4 transition`;

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (view !== 'reset') {
      if (!values.email.trim()) nextErrors.email = 'Enter your email address.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) nextErrors.email = 'Enter a valid email address.';
    }
    if (view === 'signup' && !values.name.trim()) nextErrors.name = 'Enter your name.';
    if (view === 'signin' && !values.password) nextErrors.password = 'Enter your password.';
    if (view === 'signup' || view === 'reset') {
      if (!values.password) nextErrors.password = view === 'reset' ? 'Enter a new password.' : 'Enter a password.';
      else if (values.password.length < 8) nextErrors.password = 'Use at least 8 characters.';
      if (values.password !== values.confirm) nextErrors.confirm = 'Passwords do not match.';
    }
    setErrors(nextErrors);
    setNotice('');
    setErrorMessage('');
    if (Object.keys(nextErrors).length) return;
    if (!configured) { setErrorMessage('Supabase is not configured. Add the project URL and publishable key to the local environment.'); return; }

    setSubmitting(true);
    try {
      if (view === 'signin') {
        const { data, error } = await signIn(values.email.trim(), values.password);
        if (error) throw error;
        if (!data.session) { setNotice('Sign-in was not completed. Check your email confirmation or try again.'); return; }
        await refreshProfile(data.session.user.id);
        onAuthSuccess?.();
      } else if (view === 'signup') {
        const { data, error } = await signUp(values.email.trim(), values.password, values.name.trim());
        if (error) throw error;
        if (data.session) onAuthSuccess?.();
        else setNotice('Account request received. Check your email to confirm your address, then sign in. New accounts start with community access.');
      } else if (view === 'forgot') {
        const { error } = await resetPassword(values.email.trim());
        if (error) throw error;
        setNotice('If an account exists for that address, a password reset email is on its way.');
      } else {
        const { error } = await updatePassword(values.password);
        if (error) throw error;
        setNotice('Password updated. You can now continue using your new password.');
        setView('signin');
        setValues((previous) => ({ ...previous, password: '', confirm: '' }));
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (error) {
      setErrorMessage(error.message || 'Authentication failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  const title = view === 'signin' ? 'Welcome back' : view === 'signup' ? 'Join your community' : view === 'forgot' ? 'Forgot your password?' : 'Choose a new password';
  const subtitle = view === 'signin' ? 'Sign in to continue to ResiliMap.' : view === 'signup' ? 'Create a community account. Authority access can be requested from your profile after signing in.' : view === 'forgot' ? 'Enter your email and we’ll send a reset link if an account exists.' : 'Choose a password with at least 8 characters.';

  return (
    <main className="auth-page flex min-h-screen flex-col items-center justify-center bg-[#f5f8f5] dark:bg-[#050505] px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button onClick={() => setActiveTab('landing')} className="inline-flex items-center gap-2 rounded text-sm font-semibold text-stone-600 dark:text-slate-300 hover:text-teal-800 dark:hover:text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700"><ArrowLeft className="h-4 w-4" /> Back to ResiliMap</button>
          <button type="button" onClick={() => setDarkMode(!darkMode)} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={darkMode} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} className="rounded-xl border border-stone-200 bg-white p-2.5 text-stone-600 transition hover:bg-stone-100 dark:border-[#303030] dark:bg-[#111111] dark:text-slate-200 dark:hover:bg-[#242424]">
            {darkMode ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
        <section className="rounded-3xl border border-stone-200 bg-white dark:border-[#2b2b2b] dark:bg-[#111111] p-6 shadow-xl shadow-emerald-950/5 sm:p-9">
          <div className="mb-7 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-800 text-white"><MapPin className="h-6 w-6" /></div><div><div className="text-lg font-extrabold text-stone-900">ResiliMap</div><div className="text-xs text-stone-500">Map Today. Prepare for Tomorrow.</div><div className="text-[10px] text-stone-400">Community-Powered Climate Resilience Platform</div></div></div>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">{title}</h1>
          <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
          {!configured && <div role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900"><strong>Setup required:</strong> Authentication is unavailable until this app has a Supabase project URL and publishable key in its local environment.</div>}
          {user && view !== 'reset' && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900">You are signed in. <button onClick={onAuthSuccess} className="font-bold underline">Continue</button></div>}
          <form className="mt-7 space-y-4" onSubmit={submit} noValidate>
            {view === 'signup' && <div><label htmlFor="auth-name" className="mb-1.5 block text-sm font-semibold text-stone-700">Full name</label><input id="auth-name" autoComplete="name" value={values.name} onChange={update('name')} className={fieldClass(errors.name)} placeholder="Your name" aria-invalid={!!errors.name} />{errors.name && <p className="mt-1 text-xs text-rose-700">{errors.name}</p>}</div>}
            <div><label htmlFor="auth-email" className="mb-1.5 block text-sm font-semibold text-stone-700">Email address</label><div className="relative"><Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input id="auth-email" type="email" autoComplete="email" value={values.email} onChange={update('email')} className={`${fieldClass(errors.email)} pl-10`} placeholder="you@example.com" aria-invalid={!!errors.email} /></div>{errors.email && <p className="mt-1 text-xs text-rose-700">{errors.email}</p>}</div>
            {(view === 'signin' || view === 'signup') && <div><label htmlFor="auth-password" className="mb-1.5 block text-sm font-semibold text-stone-700">Password</label><div className="relative"><LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input id="auth-password" type={showPass ? 'text' : 'password'} autoComplete={view === 'signin' ? 'current-password' : 'new-password'} value={values.password} onChange={update('password')} className={`${fieldClass(errors.password)} pl-10 pr-11`} placeholder={view === 'signin' ? 'Your password' : 'At least 8 characters'} aria-invalid={!!errors.password} /><button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Hide password' : 'Show password'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700">{showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>{errors.password && <p className="mt-1 text-xs text-rose-700">{errors.password}</p>}</div>}
            {view === 'reset' && <div><label htmlFor="auth-password" className="mb-1.5 block text-sm font-semibold text-stone-700">New password</label><div className="relative"><LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input id="auth-password" type={showPass ? 'text' : 'password'} autoComplete="new-password" value={values.password} onChange={update('password')} className={`${fieldClass(errors.password)} pl-10 pr-11`} placeholder="At least 8 characters" aria-invalid={!!errors.password} /><button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Hide password' : 'Show password'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700">{showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>{errors.password && <p className="mt-1 text-xs text-rose-700">{errors.password}</p>}</div>}
            {(view === 'signup' || view === 'reset') && <div><label htmlFor="auth-confirm" className="mb-1.5 block text-sm font-semibold text-stone-700">Confirm password</label><input id="auth-confirm" type="password" autoComplete="new-password" value={values.confirm} onChange={update('confirm')} className={fieldClass(errors.confirm)} placeholder="Re-enter your password" aria-invalid={!!errors.confirm} />{errors.confirm && <p className="mt-1 text-xs text-rose-700">{errors.confirm}</p>}</div>}
            {view === 'signin' && <div className="text-right"><button type="button" onClick={() => changeView('forgot')} className="text-sm font-semibold text-teal-800 hover:underline">Forgot password?</button></div>}
            {view === 'signup' && <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3.5 text-xs leading-relaxed text-emerald-900">New accounts receive community access. You can request authority access from your profile after signing in.</div>}
            {errorMessage && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs leading-relaxed text-rose-900">{errorMessage}</div>}
            {notice && <div role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-xs leading-relaxed text-sky-900">{notice}</div>}
            <button type="submit" disabled={submitting || authLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">{submitting ? 'Please wait…' : view === 'signin' ? <><LogIn className="h-4 w-4" /> Sign In</> : view === 'signup' ? <><UserPlus className="h-4 w-4" /> Create community account</> : view === 'forgot' ? 'Send reset link' : 'Update password'}</button>
          </form>
          <div className="mt-6 text-center text-sm text-stone-600">{view === 'signin' && <>New to ResiliMap? <button onClick={() => changeView('signup')} className="font-bold text-teal-800 hover:underline">Create an account</button></>}{view === 'signup' && <>Already registered? <button onClick={() => changeView('signin')} className="font-bold text-teal-800 hover:underline">Sign in</button></>}{(view === 'forgot' || view === 'reset') && <button onClick={() => changeView('signin')} className="font-bold text-teal-800 hover:underline">Return to sign in</button>}</div>
          {view !== 'reset' && <button onClick={() => setActiveTab('map')} className="mt-5 flex w-full items-center justify-center text-xs font-semibold text-stone-500 hover:text-teal-800">Explore public risk information without signing in</button>}
        </section>
        <p className="mt-5 flex items-start justify-center gap-2 px-2 text-center text-xs leading-relaxed text-stone-500"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> Role-based UI checks are for navigation only. Database policies enforce access to protected data.</p>
      </div>
    </main>
  );
}
