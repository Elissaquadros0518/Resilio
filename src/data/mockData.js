export const INITIAL_REPORTS = [
  { id: "VW-2026-00124", category: "Flooding / Waterlogging", location: "Near Vidyavihar Railway Station (West)", lat: 19.0782, lng: 72.8933, time: "18 mins ago", severity: "HIGH", status: "Under verification", description: "Heavy accumulation of water near the station subway making pedestrian walk impossible.", evidence: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80", verified: false, upvotes: 14, user: "Aarav S." },
  { id: "VW-2026-00123", category: "Drainage Problem", location: "Somaiya Vidyavihar Campus Road", lat: 19.0732, lng: 72.8983, time: "42 mins ago", severity: "MEDIUM", status: "Verified", description: "Choked stormwater drain overflowing onto bicycle lanes.", evidence: "https://images.unsplash.com/photo-1584467735811-9942f88cc227?auto=format&fit=crop&w=600&q=80", verified: true, upvotes: 29, user: "Priya M." },
  { id: "VW-2026-00122", category: "Extreme Heat", location: "Vidyavihar East Market Area", lat: 19.0801, lng: 72.8950, time: "1 hour ago", severity: "MEDIUM", status: "Verified", description: "Surface asphalt temperatures extremely high, lack of shaded shelters for commuters.", evidence: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80", verified: true, upvotes: 8, user: "Rohan K." },
  { id: "VW-2026-00121", category: "Road Problem", location: "Garodia Nagar Main Road", lat: 19.0760, lng: 72.9010, time: "3 hours ago", severity: "CRITICAL", status: "Authority notified", description: "Large pothole opened up due to underground pipe seepage.", evidence: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80", verified: true, upvotes: 45, user: "Sneha D." },
  { id: "VW-2026-00120", category: "Fallen Tree", location: "Nehru Nagar Link Road", lat: 19.0715, lng: 72.8912, time: "5 hours ago", severity: "HIGH", status: "Resolved", description: "Branch fell blocking half the lane. Cleared by civic workers.", evidence: "https://images.unsplash.com/photo-1508873696983-2df5c92063c7?auto=format&fit=crop&w=600&q=80", verified: true, upvotes: 31, user: "Vikram P." }
];

export const INITIAL_ALERTS = [
  { id: "ALT-01", type: "CRITICAL", title: "Heavy Rainfall & Tide Alert", desc: "Moderate to heavy showers expected alongside high tide in Mumbai. Avoid low-lying Vidyavihar subway.", time: "10 mins ago", category: "Flooding" },
  { id: "ALT-02", type: "WARNING", title: "Heat Advisory (37°C)", desc: "Peak afternoon temperatures likely to induce heat stress. Stay hydrated and avoid strenuous outdoor exercise.", time: "2 hours ago", category: "Heat" },
  { id: "ALT-03", type: "INFO", title: "Drainage Maintenance Drive", desc: "Municipal ward teams conducting desilting operations near railway tracks.", time: "1 day ago", category: "Infrastructure" }
];

export const EMERGENCY_RESOURCES = [
  { id: 'res-1', type: 'Hospitals', name: 'Rajawadi Hospital (Ghatkopar East)', distance: '1.8 km', address: 'Vallabhbhai Patel Rd, Ghatkopar East, Mumbai', phone: '+91 22 2512 7171', coords: [19.0805, 72.9080] },
  { id: 'res-2', type: 'Fire Stations', name: 'Vikhroli / Ghatkopar Fire Station', distance: '2.5 km', address: 'LBS Marg, Ghatkopar West, Mumbai', phone: '101 / +91 22 2511 2233', coords: [19.0900, 72.9100] },
  { id: 'res-3', type: 'Police Stations', name: 'Pant Nagar Police Station', distance: '1.2 km', address: 'Pant Nagar, Ghatkopar East, Mumbai', phone: '100 / +91 22 2515 1234', coords: [19.0820, 72.9030] },
  { id: 'res-4', type: 'Emergency Shelters', name: 'Somaiya Community Multipurpose Hall', distance: '0.6 km', address: 'Vidyavihar East Campus', phone: '+91 22 6723 8000', coords: [19.0732, 72.8983] },
  { id: 'res-5', type: 'Water Facilities', name: 'Municipal Ward Water Tank & Pumping Station', distance: '1.0 km', address: 'Near Vidyavihar Railway Station West', phone: '+91 22 2510 4455', coords: [19.0775, 72.8920] }
];

export const HOTSPOTS = [
  { id: 'h1', title: 'Vidyavihar Station West Subway', issue: 'Waterlogging & Heavy Pedestrian Rush', score: 82, reports: 47, trend: 'Increasing', lat: 19.0782, lng: 72.8933 },
  { id: 'h2', title: 'Somaiya Junction Asphalt Corridor', issue: 'Urban Heat Island Effect', score: 74, reports: 32, trend: 'Stable', lat: 19.0732, lng: 72.8983 },
  { id: 'h3', title: 'Garodia Nagar Internal Drains', issue: 'Drainage Chokepoints', score: 69, reports: 28, trend: 'Decreasing', lat: 19.0760, lng: 72.9010 }
];

export const CLIMATE_TIME_SERIES = {
  "7 Days": [ { day: 'Mon', floods: 2, heat: 5, water: 1, infra: 3 }, { day: 'Tue', floods: 4, heat: 6, water: 2, infra: 4 }, { day: 'Wed', floods: 6, heat: 4, water: 3, infra: 2 }, { day: 'Thu', floods: 3, heat: 7, water: 1, infra: 5 }, { day: 'Fri', floods: 8, heat: 8, water: 4, infra: 6 }, { day: 'Sat', floods: 5, heat: 6, water: 2, infra: 3 }, { day: 'Sun', floods: 7, heat: 9, water: 3, infra: 4 } ],
  "30 Days": [ { day: 'Week 1', floods: 12, heat: 22, water: 8, infra: 15 }, { day: 'Week 2', floods: 18, heat: 28, water: 12, infra: 19 }, { day: 'Week 3', floods: 25, heat: 31, water: 15, infra: 22 }, { day: 'Week 4', floods: 20, heat: 27, water: 10, infra: 18 } ],
  "6 Months": [ { day: 'Nov', floods: 5, heat: 18, water: 4, infra: 10 }, { day: 'Dec', floods: 2, heat: 12, water: 2, infra: 8 }, { day: 'Jan', floods: 1, heat: 15, water: 3, infra: 7 }, { day: 'Feb', floods: 4, heat: 25, water: 6, infra: 12 }, { day: 'Mar', floods: 8, heat: 35, water: 11, infra: 18 }, { day: 'Apr', floods: 15, heat: 42, water: 14, infra: 24 } ],
  "1 Year": [ { day: 'Q1', floods: 10, heat: 50, water: 15, infra: 35 }, { day: 'Q2', floods: 45, heat: 90, water: 30, infra: 60 }, { day: 'Q3', floods: 120, heat: 60, water: 45, infra: 85 }, { day: 'Q4', floods: 25, heat: 40, water: 12, infra: 30 } ]
};