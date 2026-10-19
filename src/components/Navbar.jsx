import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, Bell, Sun, Moon, PlusCircle, UserRound, Menu, X, Map, BarChart3, UsersRound, LifeBuoy, ClipboardCheck } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, isAuthorityView, hasAuthorityAccess, user, profile, onSignOut, darkMode, setDarkMode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const navigationItems = [
    { id: 'home', label: 'Home', icon: ShieldAlert },
    { id: 'map', label: 'Live Map', icon: Map },
    { id: 'insights', label: 'Risk Insights', icon: BarChart3 },
    { id: 'community', label: 'Community', icon: UsersRound },
    { id: 'resources', label: 'Resources', icon: LifeBuoy },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    ...(user ? [{ id: 'profile', label: 'Profile', icon: UserRound }] : []),
    ...(hasAuthorityAccess ? [{ id: 'authority', label: 'Authority Dashboard', icon: ClipboardCheck }] : []),
    ...(user ? [] : [{ id: 'sign-in', label: 'Sign in', icon: UserRound }]),
    { id: 'report', label: 'Report Issue', icon: PlusCircle },
  ];

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen]);

  const selectMobileItem = (id) => {
    setMobileMenuOpen(false);
    setActiveTab(id);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  };
  const primaryItems = navigationItems.filter((item) => ['home', 'map', 'insights', 'community', 'resources'].includes(item.id));

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-navy-800/95">
      <div className="mx-auto grid min-h-[4.5rem] max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:px-8">
        <button type="button" aria-label="Riskscape home" className="group flex min-w-0 items-center space-x-3 text-left" onClick={() => selectMobileItem('home')}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white transition group-hover:bg-emerald-900">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold tracking-tight text-emerald-900 dark:text-emerald-300">Riskscape</h1>
            <p className="hidden whitespace-nowrap text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400 2xl:block">Mapping Risks. Building Resilience.</p>
          </div>
        </button>

        <nav aria-label="Main navigation" className="hidden min-w-0 items-center justify-self-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-navy-900/80 xl:flex">
          {primaryItems.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} aria-current={activeTab === tab.id ? 'page' : undefined} className={`whitespace-nowrap rounded-lg px-2 py-2 text-xs font-semibold transition xl:px-2.5 2xl:px-3.5 2xl:text-sm ${activeTab === tab.id && !isAuthorityView ? 'bg-white text-emerald-900 shadow-sm dark:bg-navy-700 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center justify-self-end gap-1 sm:gap-1.5 xl:flex 2xl:gap-2">
          <button type="button" aria-label="Alerts" onClick={() => setActiveTab('alerts')} className="relative hidden rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-navy-700 sm:inline-flex" title="Alerts">
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span className="absolute right-2 top-2 h-2 w-2 animate-ping rounded-full bg-criticalRed" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-criticalRed" />
          </button>

          {user && <button type="button" onClick={() => setActiveTab('profile')} aria-label="Open your profile" aria-current={activeTab === 'profile' ? 'page' : undefined} title="Profile" className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition focus:outline-none focus:ring-4 focus:ring-emerald-100 ${activeTab === 'profile' ? 'border-emerald-800 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100' : 'border-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-navy-700'}`}>
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </button>}

          {user ? <button type="button" onClick={onSignOut} className="inline-flex rounded-xl px-2 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-200 sm:px-3" title={`Sign out${profile?.display_name ? ` ${profile.display_name}` : ''}`}>Sign out</button>
            : <button type="button" onClick={() => setActiveTab('sign-in')} className="rounded-xl bg-emerald-800 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-900">Sign in</button>}

          <button type="button" aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setDarkMode(!darkMode)} className="rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-navy-700" title="Theme">
            {darkMode ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button>

          <button type="button" onClick={() => setActiveTab('report')} aria-label="Report Issue" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-3 text-sm font-bold text-white transition hover:bg-emerald-900 2xl:px-4">
            <PlusCircle className="h-4 w-4" aria-hidden="true" /><span className="hidden 2xl:inline">Report Issue</span>
          </button>
        </div>

        <button ref={menuButtonRef} type="button" className="inline-flex h-11 w-11 items-center justify-center justify-self-end rounded-xl text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-slate-100 dark:hover:bg-navy-700 xl:hidden" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation-menu" onClick={() => setMobileMenuOpen((open) => !open)}>
          {mobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      {mobileMenuOpen && <nav id="mobile-navigation-menu" aria-label="Mobile navigation" className="absolute left-0 right-0 top-full max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-b border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-navy-800 xl:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-1 sm:grid-cols-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} type="button" onClick={() => selectMobileItem(item.id)} aria-current={activeTab === item.id ? 'page' : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${activeTab === item.id && !isAuthorityView ? 'bg-emerald-50 text-emerald-900 dark:bg-navy-700 dark:text-emerald-200' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-navy-700'}`}><Icon className="h-5 w-5 shrink-0" aria-hidden="true" />{item.label}</button>;
          })}
          {user && <button type="button" onClick={() => { setMobileMenuOpen(false); onSignOut?.(); }} className="flex min-h-12 items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-slate-200 dark:hover:bg-navy-700"><UserRound className="h-5 w-5 shrink-0" aria-hidden="true" />Sign out{profile?.display_name ? ` ${profile.display_name}` : ''}</button>}
          <button type="button" onClick={() => { setDarkMode(!darkMode); setMobileMenuOpen(false); }} className="flex min-h-12 items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-slate-200 dark:hover:bg-navy-700">{darkMode ? <Sun className="h-5 w-5 shrink-0" aria-hidden="true" /> : <Moon className="h-5 w-5 shrink-0" aria-hidden="true" />}{darkMode ? 'Light theme' : 'Dark theme'}</button>
        </div>
      </nav>}
    </header>
  );
}
