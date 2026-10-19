import React from 'react';
import { Flame, HeartPulse, MapPin, Navigation, Phone, Shield, Siren } from 'lucide-react';

const EMERGENCY_HELPLINES = [
  { name: 'All Emergencies', number: '112', href: 'tel:112' },
  { name: 'Fire Brigade', number: '101', href: 'tel:101' },
  { name: 'Police', number: '100', href: 'tel:100' },
  { name: 'Ambulance', number: '108', href: 'tel:108' },
  { name: 'BMC Civic Assistance', number: '1916', href: 'tel:1916' },
];

const FACILITIES = [
  {
    id: 'rajawadi-hospital',
    name: 'Rajawadi Hospital',
    category: 'Hospital',
    locality: 'Ghatkopar East, Mumbai',
    phone: '+912225115066',
    phoneLabel: '+91 22 2511 5066',
    phoneStatus: 'Verified',
  },
  {
    id: 'vedant-central-hospital',
    name: 'Vedant Central Hospital',
    category: 'Hospital',
    locality: 'Ghatkopar West, Mumbai',
    phone: '18002671444',
    phoneLabel: '1800 267 1444',
    phoneStatus: 'Verified',
  },
  {
    id: 'kurla-fire-station',
    name: 'Kurla Fire Station',
    category: 'Fire Station',
    locality: 'Vidyavihar West / Kurla, Mumbai',
    phone: '+912225039200',
    phoneLabel: '+91 22 2503 9200',
    phoneStatus: 'Verified',
  },
  {
    id: 'ramabai-nagar-fire-station',
    name: 'Ramabai Nagar Fire Station',
    category: 'Fire Station',
    locality: 'Ghatkopar East, Mumbai',
    phone: null,
    phoneLabel: null,
    phoneStatus: 'Direct number not confirmed',
    fallbackPhone: '101',
  },
  {
    id: 'pant-nagar-police-station',
    name: 'Pant Nagar Police Station',
    category: 'Police Station',
    locality: 'Ghatkopar East, Mumbai',
    phone: '+912225013624',
    phoneLabel: '+91 22 2501 3624',
    phoneStatus: 'Verified',
  },
  {
    id: 'parksite-police-station',
    name: 'Parksite Police Station',
    category: 'Police Station',
    locality: 'Ghatkopar West, Mumbai',
    phone: '+912225789368',
    phoneLabel: '+91 22 2578 9368',
    phoneStatus: 'Unverified — confirm before relying on this number',
  },
];

const FACILITY_GROUPS = [
  {
    category: 'Hospital',
    description: 'Nearby hospitals and medical help.',
    icon: HeartPulse,
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
    iconClass: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
  },
  {
    category: 'Fire Station',
    description: 'Local fire and rescue services.',
    icon: Flame,
    badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
    iconClass: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
  },
  {
    category: 'Police Station',
    description: 'Nearby Mumbai Police stations.',
    icon: Shield,
    badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
    iconClass: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300',
  },
];

export function getDirectionsUrl(resource) {
  const destination = `${resource.name}, ${resource.locality}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

function FacilityCard({ resource, group }) {
  const Icon = group.icon;
  const callHref = resource.phone ? `tel:${resource.phone}` : `tel:${resource.fallbackPhone}`;
  const callLabel = resource.phone ? 'Call Now' : 'Call Fire Helpline — 101';

  return (
    <article className="flex h-full flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-700/80 dark:bg-navy-800 sm:p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${group.iconClass}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${group.badgeClass}`}>{resource.category}</span>
        </div>
        <div>
          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{resource.name}</h4>
          <p className="mt-2 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-skyBlue" aria-hidden="true" />
            <span>{resource.locality}</span>
          </p>
        </div>
        {resource.phoneLabel ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Phone className="h-4 w-4 shrink-0 text-safeGreen" aria-hidden="true" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">{resource.phoneLabel}</span>
            {resource.phoneStatus !== 'Verified' && <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Unverified number</span>}
          </div>
        ) : (
          <p className="text-sm text-amber-700 dark:text-amber-300">Direct phone number not confirmed. Use the fire helpline.</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <a
          href={callHref}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-3 py-3 text-center text-sm font-bold text-white transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          aria-label={`${callLabel}: ${resource.name}`}
        >
          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{callLabel}</span>
        </a>
        <a
          href={getDirectionsUrl(resource)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-3 text-center text-sm font-bold text-slate-800 transition hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:bg-navy-700 dark:text-slate-100 dark:hover:bg-navy-600"
          aria-label={`Get directions to ${resource.name}`}
        >
          <Navigation className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Get Directions</span>
        </a>
      </div>
    </article>
  );
}

export default function ResourcesPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-7 sm:space-y-10 sm:px-6 sm:py-9 lg:px-8">
      <header className="space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Nearby Emergency Resources</h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">Emergency helplines and nearby hospitals, fire stations, and police stations.</p>
      </header>

      <section aria-labelledby="helplines-heading" className="overflow-hidden rounded-3xl bg-emerald-900 p-5 text-white shadow-card sm:p-7 lg:p-8">
        <div className="mb-5 flex items-center gap-3 sm:mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
            <Siren className="h-6 w-6 text-amber-300" aria-hidden="true" />
          </div>
          <div>
            <h3 id="helplines-heading" className="text-xl font-extrabold sm:text-2xl">Emergency Helplines</h3>
            <p className="mt-1 text-sm text-emerald-100">Tap a number to call from your device.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {EMERGENCY_HELPLINES.map((item, index) => (
            <div key={item.name} className={`rounded-2xl border p-4 ${index === 0 ? 'border-amber-300/50 bg-white/20' : 'border-white/20 bg-white/10'}`}>
              <p className="text-sm font-semibold text-emerald-50">{item.name}</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight">{item.number}</p>
              <a
                href={item.href}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label={`Call ${item.name}, ${item.number}`}
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                <span>Call Now</span>
              </a>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-8 sm:space-y-10">
        {FACILITY_GROUPS.map((group) => {
          const Icon = group.icon;
          const resources = FACILITIES.filter((resource) => resource.category === group.category);
          return (
            <section key={group.category} aria-labelledby={`resources-${group.category.replaceAll(' ', '-').toLowerCase()}`} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${group.iconClass}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 id={`resources-${group.category.replaceAll(' ', '-').toLowerCase()}`} className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Nearby {group.category === 'Hospital' ? 'Hospitals' : `${group.category}s`}</h3>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{group.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
                {resources.map((resource) => <FacilityCard key={resource.id} resource={resource} group={group} />)}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
