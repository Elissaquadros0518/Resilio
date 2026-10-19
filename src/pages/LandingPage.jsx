import React, { useState } from 'react';
import {
  MapPin,
  Menu,
  X,
  ChevronRight,
  CloudRain,
  Sun,
  Droplets,
  Hammer,
  Users,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Map,
  PlusCircle,
  TreePine,
  Wind,
  Activity,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   PUBLIC NAVBAR
───────────────────────────────────────────── */
function PublicNavbar({ setActiveTab }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Home', href: 'landing' },
    { label: 'How It Works', href: 'how-it-works' },
    { label: 'Community Impact', href: 'community-impact' },
    { label: 'About', href: 'about' },
  ];

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-stone-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Wordmark */}
        <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => scrollTo('hero')}>
          <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-sm">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="leading-none">
            <span className="font-extrabold text-base text-stone-900 tracking-tight">Riskscape</span>
            <span className="hidden sm:block text-[10px] font-medium text-teal-700 tracking-wide">Mapping Risks. Building Resilience.</span>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center space-x-1">
          {navLinks.map(link => (
            <button
              key={link.label}
              onClick={() => link.href === 'landing' ? scrollTo('hero') : scrollTo(link.href)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-stone-600 hover:text-teal-700 hover:bg-teal-50 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* CTA group */}
        <div className="hidden md:flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('sign-in')}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-stone-700 hover:bg-stone-100 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab('sign-in')}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-teal-700 text-white hover:bg-teal-800 transition shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          >
            Get Started
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-stone-100 px-4 py-4 space-y-1 shadow-lg animate-fadeIn">
          {navLinks.map(link => (
            <button
              key={link.label}
              onClick={() => link.href === 'landing' ? scrollTo('hero') : scrollTo(link.href)}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-stone-700 hover:bg-teal-50 hover:text-teal-700 transition"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-3 border-t border-stone-100 space-y-2">
            <button
              onClick={() => { setActiveTab('sign-in'); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-stone-700 border border-stone-200 hover:bg-stone-50 transition"
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab('sign-in'); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-bold bg-teal-700 text-white hover:bg-teal-800 transition"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

/* ─────────────────────────────────────────────
   MAP PREVIEW (static illustrative panel)
───────────────────────────────────────────── */
function MapPreview() {
  const pins = [
    { top: '28%', left: '42%', color: 'bg-red-500', ring: 'ring-red-200', label: 'Flooding — HIGH' },
    { top: '52%', left: '62%', color: 'bg-orange-500', ring: 'ring-orange-200', label: 'Road Damage — MEDIUM' },
    { top: '38%', left: '25%', color: 'bg-amber-500', ring: 'ring-amber-200', label: 'Heat Hotspot — MEDIUM' },
    { top: '65%', left: '48%', color: 'bg-teal-500', ring: 'ring-teal-200', label: 'Drainage — LOW' },
  ];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-stone-200 shadow-sm bg-stone-50" style={{ height: 340 }}>
      {/* OSM-style tile grid background */}
      <div className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148,163,184,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.4) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          backgroundColor: '#f1f5f9'
        }}
      />
      {/* Road-like shapes */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 340" preserveAspectRatio="none">
        <path d="M0 170 Q 150 140 300 175 Q 450 210 600 180" stroke="#cbd5e1" strokeWidth="10" fill="none" />
        <path d="M200 0 Q 220 100 210 180 Q 205 250 215 340" stroke="#cbd5e1" strokeWidth="8" fill="none" />
        <path d="M0 280 Q 200 260 380 270 Q 500 275 600 260" stroke="#cbd5e1" strokeWidth="6" fill="none" />
        <path d="M350 0 Q 360 80 340 160 Q 325 240 345 340" stroke="#e2e8f0" strokeWidth="6" fill="none" />
        <rect x="60" y="80" width="90" height="60" rx="4" fill="#e2e8f0" />
        <rect x="410" y="200" width="110" height="70" rx="4" fill="#e2e8f0" />
        <rect x="250" y="50" width="70" height="50" rx="4" fill="#e2e8f0" />
        <rect x="80" y="220" width="85" height="55" rx="4" fill="#e2e8f0" />
      </svg>

      {/* Risk circle overlays */}
      <div className="absolute" style={{ top: '26%', left: '38%' }}>
        <div className="w-24 h-24 rounded-full bg-red-400 opacity-15" />
      </div>
      <div className="absolute" style={{ top: '34%', left: '21%' }}>
        <div className="w-16 h-16 rounded-full bg-amber-400 opacity-15" />
      </div>

      {/* Pins */}
      {pins.map((pin, i) => (
        <div
          key={i}
          className="absolute group"
          style={{ top: pin.top, left: pin.left }}
        >
          <div className={`relative w-5 h-5 ${pin.color} rounded-full ring-4 ${pin.ring} shadow-md cursor-default`}>
            <div className={`absolute inset-0 ${pin.color} rounded-full animate-ping opacity-40`} style={{ animationDuration: `${2 + i * 0.4}s` }} />
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-7 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none shadow-lg">
            {pin.label}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-xl px-3 py-2 flex items-center gap-3 shadow-sm">
        {[
          { color: 'bg-red-500', label: 'Critical' },
          { color: 'bg-orange-500', label: 'High' },
          { color: 'bg-amber-500', label: 'Medium' },
          { color: 'bg-teal-500', label: 'Low' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
            <span className="text-[10px] font-semibold text-stone-600">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Preview badge */}
      <div className="absolute top-3 right-3 bg-stone-800/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
        Illustrative preview
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   RISK CATEGORY CARD
───────────────────────────────────────────── */
function RiskCard({ icon: Icon, color, bg, title, desc }) {
  return (
    <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-stone-200 shadow-sm hover:shadow-md hover:border-teal-200 transition group">
      <div className={`shrink-0 w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="font-bold text-sm text-stone-900 group-hover:text-teal-700 transition">{title}</div>
        <div className="text-xs text-stone-500 mt-1 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STEP CARD (How It Works)
───────────────────────────────────────────── */
function StepCard({ number, icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col items-center text-center px-4">
      <div className="relative mb-5">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-sm">
          <Icon className="w-6 h-6" />
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-teal-700 text-white text-[11px] font-extrabold flex items-center justify-center shadow">
          {number}
        </div>
      </div>
      <div className="font-bold text-stone-900 text-base mb-2">{title}</div>
      <div className="text-sm text-stone-500 leading-relaxed max-w-xs">{desc}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PUBLIC FOOTER
───────────────────────────────────────────── */
function PublicFooter({ setActiveTab }) {
  return (
    <footer className="bg-stone-900 text-stone-300 py-14 px-4 sm:px-6 lg:px-8 border-t border-stone-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-10">
        {/* Brand */}
        <div className="space-y-3 sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-white text-base">Riskscape</span>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed max-w-xs">
            A community-driven climate risk mapping and resilience platform helping communities understand local risks.
          </p>
        </div>

        {/* Platform links */}
        <div>
          <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Platform</h4>
          <ul className="space-y-2.5 text-sm">
            {[
              { label: 'Live Risk Map', tab: 'map' },
              { label: 'Report an Issue', tab: 'report' },
              { label: 'Risk Insights', tab: 'insights' },
              { label: 'Community', tab: 'community' },
            ].map(item => (
              <li key={item.label}>
                <button
                  onClick={() => setActiveTab(item.tab)}
                  className="text-stone-400 hover:text-teal-400 transition text-xs font-medium"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Emergency */}
        <div>
          <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Emergency & Data</h4>
          <ul className="space-y-2.5 text-xs text-stone-400 font-medium">
            <li><button onClick={() => setActiveTab('resources')} className="hover:text-teal-400 transition">Emergency Resources</button></li>
            <li><button onClick={() => setActiveTab('alerts')} className="hover:text-teal-400 transition">Early Warning Alerts</button></li>
            <li className="text-stone-500">Data: OpenStreetMap, IMD, NASA</li>
          </ul>
        </div>

        {/* About */}
        <div>
          <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">About</h4>
          <ul className="space-y-2.5 text-xs text-stone-400 font-medium">
            <li className="hover:text-teal-400 transition cursor-default">Don Bosco Institute of Technology</li>
            <li className="hover:text-teal-400 transition cursor-default">Open Source Project</li>
            <li className="hover:text-teal-400 transition cursor-default">Contact Us</li>
          </ul>
        </div>
      </div>

      {/* Disclaimer + copyright */}
      <div className="max-w-7xl mx-auto border-t border-stone-800 pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-[11px] text-stone-500 max-w-lg leading-relaxed">
          ⚠️ Riskscape supports community awareness only and does not replace official emergency services. In an emergency, call 112 (India) or your local authority.
        </p>
        <p className="text-[11px] text-stone-600 shrink-0">© 2026 Riskscape. All rights reserved.</p>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   MAIN LANDING PAGE EXPORT
───────────────────────────────────────────── */
export default function LandingPage({ setActiveTab }) {
  const riskCategories = [
    {
      icon: CloudRain,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      title: 'Flooding & Waterlogging',
      desc: 'Track subway flooding, drain overflows, and high-tide alerts in real time.',
    },
    {
      icon: Sun,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      title: 'Extreme Heat',
      desc: 'Monitor urban heat islands, asphalt temperatures, and heat-stress hotspots.',
    },
    {
      icon: Droplets,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      title: 'Water Scarcity',
      desc: 'Report supply shortages, broken pipes, and contamination concerns.',
    },
    {
      icon: Hammer,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      title: 'Infrastructure Damage',
      desc: 'Document potholes, fallen trees, blocked drains, and power failures.',
    },
    {
      icon: Wind,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      title: 'Air Quality',
      desc: 'Flag construction dust, vehicle emissions, and poor-AQI events near you.',
    },
    {
      icon: TreePine,
      color: 'text-green-600',
      bg: 'bg-green-50',
      title: 'Environmental Issues',
      desc: 'Report illegal dumping, deforestation, and habitat degradation locally.',
    },
  ];

  return (
    <div className="bg-stone-50 text-stone-900 min-h-screen flex flex-col">
      <PublicNavbar setActiveTab={setActiveTab} />

      {/* ── HERO ─────────────────────────────── */}
      <section
        id="hero"
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 flex flex-col lg:flex-row items-center gap-14"
      >
        {/* Text */}
        <div className="flex-1 space-y-7 text-center lg:text-left">
          {/* Location badge */}
          <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold px-4 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            Community-powered risk mapping
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-stone-900 leading-tight tracking-tight">
            Know Your Local Risks.{' '}
            <span className="text-teal-700">Build a Safer Community.</span>
          </h1>

          <p className="text-base sm:text-lg text-stone-500 leading-relaxed max-w-xl mx-auto lg:mx-0">
            Riskscape lets residents report flooding, waterlogging, heat hotspots,
            water shortages, and other local environmental risks — then visualises them
            on an open, community-maintained map.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center lg:justify-start gap-2">
            {[
              '📍 Hyperlocal incident reporting',
              '🗺️ Live risk map',
              '📊 Risk trend analytics',
              '🤝 Authority coordination',
            ].map(feat => (
              <span key={feat} className="bg-white border border-stone-200 text-stone-600 text-xs font-medium px-3.5 py-1.5 rounded-full shadow-sm">
                {feat}
              </span>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap justify-center lg:justify-start gap-3 pt-2">
            <button
              id="cta-report-risk"
              onClick={() => setActiveTab('sign-in')}
              className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-bold px-6 py-3.5 rounded-xl shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
            >
              <PlusCircle className="w-4 h-4" />
              Report a Risk
            </button>
            <button
              id="cta-explore-map"
              onClick={() => setActiveTab('map')}
              className="inline-flex items-center gap-2 bg-white hover:bg-stone-100 text-stone-800 font-bold px-6 py-3.5 rounded-xl border border-stone-200 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-400"
            >
              <Map className="w-4 h-4" />
              Explore the Risk Map
            </button>
          </div>
        </div>

        {/* Map preview */}
        <div className="flex-1 w-full max-w-xl lg:max-w-none">
          <MapPreview />
          <p className="text-center text-[11px] text-stone-400 mt-2.5 font-medium">
            Illustrative risk map preview — real data loads after sign-in.
          </p>
        </div>
      </section>

      {/* ── FEATURE HIGHLIGHTS (demo data labelled) ── */}
      <section className="bg-white border-y border-stone-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-2 justify-center">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest bg-stone-100 px-2.5 py-1 rounded-full">Demo data</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-4">
            {[
              { val: '2,481', label: 'Reports submitted', icon: Activity, color: 'text-teal-600' },
              { val: '1,932', label: 'Verified incidents', icon: CheckCircle, color: 'text-green-600' },
              { val: '3', label: 'Active risk hotspots', icon: AlertTriangle, color: 'text-orange-500' },
              { val: '549', label: 'Issues resolved', icon: ShieldCheck, color: 'text-sky-600' },
            ].map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="flex flex-col items-center text-center space-y-1.5">
                  <Icon className={`w-6 h-6 ${m.color}`} />
                  <div className="text-3xl font-extrabold text-stone-900">{m.val}</div>
                  <div className="text-xs text-stone-500 font-medium">{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────── */}
      <section
        id="how-it-works"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-12"
      >
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">Simple process</span>
          <h2 className="text-3xl font-extrabold text-stone-900">How Riskscape works</h2>
          <p className="text-stone-500 text-base max-w-xl mx-auto leading-relaxed">
            Three steps from observation to action — no technical knowledge needed.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 relative">
          {/* Connector lines (desktop only) */}
          <div className="hidden sm:block absolute top-7 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-stone-200 z-0" />

          <StepCard
            number="1"
            icon={PlusCircle}
            title="Report a local issue"
            desc="Use your phone or desktop to log a flooding event, pothole, heat hotspot, or water shortage with a photo and location."
          />
          <StepCard
            number="2"
            icon={Map}
            title="View risks on the map"
            desc="All community reports appear on an interactive map. Filter by category, see severity levels, and explore your neighbourhood."
          />
          <StepCard
            number="3"
            icon={ShieldCheck}
            title="Help authorities prioritize"
            desc="Verified reports reach ward officials and civic teams, helping them direct resources to where the community needs it most."
          />
        </div>
      </section>

      {/* ── RISK CATEGORIES ───────────────────── */}
      <section className="bg-white border-t border-stone-200 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">What you can report</span>
            <h2 className="text-3xl font-extrabold text-stone-900">Six types of local risk</h2>
            <p className="text-stone-500 text-base max-w-xl mx-auto leading-relaxed">
              From monsoon flooding to broken infrastructure — if it affects your neighbourhood, Riskscape can map it.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {riskCategories.map(cat => (
              <RiskCard key={cat.title} {...cat} />
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMUNITY & AUTHORITY ─────────────── */}
      <section
        id="community-impact"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* For residents */}
          <div className="bg-teal-700 text-white p-8 sm:p-10 rounded-3xl space-y-5 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-extrabold">For community residents</h3>
            <p className="text-teal-100 text-sm leading-relaxed">
              You don't need to be an expert. If you see something — waterlogging, a cracked road, an unusually hot street — report it. Your observations, combined with your neighbours', create a real-time picture of local risk that civic authorities can act on.
            </p>
            <ul className="space-y-2.5">
              {[
                'Report issues in under 60 seconds',
                'Track your reports and see their status',
                'Earn recognition as a verified contributor',
                'Get early warnings before a situation worsens',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-teal-50">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-teal-300" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setActiveTab('sign-in')}
              className="inline-flex items-center gap-2 bg-white text-teal-800 font-bold text-sm px-5 py-3 rounded-xl hover:bg-teal-50 transition shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              Join as a resident
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* For authorities */}
          <div className="bg-white border border-stone-200 p-8 sm:p-10 rounded-3xl space-y-5 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-2xl font-extrabold text-stone-900">For authorized officials</h3>
            <p className="text-stone-500 text-sm leading-relaxed">
              Ward officers and civic planners get a real-time command view of verified community reports, sorted by severity. Approve, assign field teams, and close incidents — all from a dedicated authority dashboard.
            </p>
            <ul className="space-y-2.5">
              {[
                'Priority-sorted incident queue',
                'One-click verify and resolve actions',
                'Trend analytics for ward-level planning',
                'Secure authority-only access controls',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-stone-600">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-teal-500" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setActiveTab('sign-in')}
              className="inline-flex items-center gap-2 bg-stone-900 text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-stone-800 transition shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
            >
              Authority sign-in
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── ABOUT / TRANSPARENCY ──────────────── */}
      <section
        id="about"
        className="bg-stone-100 border-t border-stone-200 py-16"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">Open & community built</span>
          <h2 className="text-2xl font-extrabold text-stone-900">Built for communities. Designed for resilience.</h2>
          <p className="text-stone-500 text-sm leading-relaxed">
            Riskscape is an open-source civic-tech project from Don Bosco Institute of Technology. It began as a hyperlocal tool and is designed to support communities as coverage grows. The platform is free, non-commercial, and community funded.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {['Community-led', 'Open Source', 'Non-commercial', 'Community funded'].map(tag => (
              <span key={tag} className="bg-white border border-stone-200 text-stone-600 text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-teal-700 rounded-3xl p-10 sm:p-16 text-center space-y-6 shadow-sm">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            Ready to help map your neighbourhood's risks?
          </h2>
          <p className="text-teal-100 text-base max-w-xl mx-auto leading-relaxed">
            Join community members reporting local hazards and making their neighborhoods safer — one observation at a time.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button
              id="cta-final-join"
              onClick={() => setActiveTab('sign-in')}
              className="inline-flex items-center gap-2 bg-white text-teal-800 font-bold text-base px-8 py-4 rounded-xl hover:bg-teal-50 transition shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <PlusCircle className="w-5 h-5" />
              Join the community
            </button>
            <button
              id="cta-final-map"
              onClick={() => setActiveTab('map')}
              className="inline-flex items-center gap-2 bg-teal-800/60 hover:bg-teal-900/60 text-white font-bold text-base px-8 py-4 rounded-xl border border-white/20 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <Map className="w-5 h-5" />
              Explore the map first
            </button>
          </div>
          <p className="text-teal-300 text-xs font-medium">
            Free to use · No installation needed · Works on any device
          </p>
        </div>
      </section>

      <PublicFooter setActiveTab={setActiveTab} />
    </div>
  );
}
