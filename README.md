

# 🌍 ResiliMap

### 🗺️ Map Today. Prepare for Tomorrow.

**A community-powered climate resilience platform for hyperlocal environmental awareness.**

[![Live Website](https://img.shields.io/badge/🌐_Live_Website-Visit_ResiliMap-0F766E?style=for-the-badge)](https://resilimap.vercel.app/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.2.11-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)

</div>

---

## 📌 About the Project

**ResiliMap** is a community-powered climate resilience platform focused on collecting, visualizing, and understanding hyperlocal environmental and infrastructure-related incidents.

Communities frequently experience localized flooding, heatwaves, water shortages, and infrastructure failures. However, information about these incidents is often scattered across messaging applications and social media. General weather applications tend to provide broad forecasts, while climate dashboards commonly focus on historical or large-scale information.

ResiliMap aims to bridge this gap by providing a centralized platform where local incidents can be reported and viewed in their geographical context. By making community-level information easier to access, the platform aims to improve local awareness and support climate-resilience planning.

🌐 **Live Application:** https://resilimap.vercel.app/

## 🚨 Problem Statement

Localized climate and infrastructure issues can affect neighbourhoods without being adequately represented by city-wide weather information. Reports shared through different communication channels are fragmented, difficult to track, and challenging to use for long-term planning.

A unified platform is needed to help communities report, locate, and understand local environmental incidents and to make this information more useful for awareness, preparedness, and resilience planning.

## 🎯 Objectives

- 📍 Provide a centralized platform for hyperlocal environmental incident reporting.
- 🤝 Encourage community participation in identifying and reporting local issues.
- 🗺️ Display location-based information through interactive maps.
- 🔎 Improve awareness of recurring environmental and infrastructure challenges.
- 🛡️ Support community preparedness and informed decision-making.
- 🌱 Make organized local information useful for climate resilience planning.

## ✨ Core Capabilities

- **📝 Community incident reports** — Submit information about local environmental or infrastructure issues.
- **🗺️ Interactive mapping** — Explore report locations using Leaflet-based map functionality.
- **👤 Authentication and profiles** — User authentication and profile management through Supabase.
- **🏛️ Authority workflow** — A scoped authority review process for reports, based on role and jurisdiction.
- **🔔 Notifications and report history** — Report status changes, notifications, and status-history records.
- **📎 Private report evidence** — Supports private image/video evidence storage for reports.
- **🌦️ Weather insights** — Uses the Open-Meteo Forecast API for modelled current conditions and a five-day daily forecast.
- **📊 Data visualization** — Uses Recharts for presenting relevant information.

*Feature descriptions are based on the supplied project configuration and Supabase setup documentation. Availability may depend on application configuration and the connected Supabase project.*

## 🔄 How It Works

1. **👀 Identify an issue** — A community member notices a local environmental or infrastructure problem.
2. **📝 Submit a report** — The user provides report details and location information through the application.
3. **📍 View local information** — Reports can be explored in their geographical context.
4. **🔍 Review and update** — Authorized authorities can review reports within their assigned jurisdiction.
5. **🛡️ Build awareness** — Organized incident information can help communities understand local challenges and prepare for future risks.

## 🧰 Technology Stack

The following technologies and libraries are specified in the project's `package.json`, configuration files, and Supabase setup documentation.

| Category | Technology | Purpose |
| --- | --- | --- |
| **Frontend Framework** | React 18.3.1 | Builds the component-based user interface |
| **Programming Language** | JavaScript (ES Modules) | Application logic and interactive functionality |
| **Markup** | HTML5 | Application entry page and document structure |
| **Styling** | Tailwind CSS 3.4.3 | Utility-first, responsive UI styling |
| **CSS Processing** | PostCSS 8.4.38 | Processes CSS during the build |
| **CSS Compatibility** | Autoprefixer 10.4.19 | Adds browser-specific CSS prefixes |
| **Build Tool & Dev Server** | Vite 5.2.11 | Local development and production builds |
| **Backend Platform** | Supabase | Backend services for authentication, database, and storage |
| **Database** | PostgreSQL (through Supabase) | Stores application data, reports, profiles, and related records |
| **Backend SDK** | Supabase JavaScript Client 2.117.3 | Connects the frontend to Supabase services |
| **Map Library** | Leaflet 1.9.4 | Interactive map rendering |
| **React Map Integration** | React Leaflet 4.2.1 | React components for Leaflet maps |
| **Charts & Analytics UI** | Recharts 2.12.7 | Data visualization and charts |
| **Icon Library** | Lucide React 1.59.0 | Interface icons |
| **Weather Data API** | Open-Meteo Forecast API | Modelled current conditions and five-day forecast |
| **Deployment** | Vercel | Hosts the deployed web application |
| **Runtime / Package Manager** | Node.js and npm | Installs dependencies and runs project scripts |

### 🧩 Development Dependencies

- `@vitejs/plugin-react` — React integration for Vite.
- `vite` — Development server and bundler.
- `tailwindcss` — Utility-first CSS framework.
- `postcss` — CSS transformation tool.
- `autoprefixer` — CSS vendor-prefix automation.

## 🏗️ Project Structure

The supplied configuration confirms a Vite application with its HTML entry point at `index.html` and React source code under `src/`.

```text
ResiliMap/
├── public/                  # Static public assets (if present)
├── src/
│   ├── main.jsx             # React application entry point
│   └── ...                  # Application components and modules
├── supabase/
│   ├── migrations/          # Database schema and security migrations
│   └── tests/               # Database regression tests (if present)
├── index.html               # HTML entry point
├── package.json             # Scripts and dependencies
├── package-lock.json        # Locked dependency versions
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── .gitignore               # Ignored files and folders
└── SUPABASE_SETUP.md        # Supabase configuration and database setup
```

## 🚀 Getting Started

Follow these steps to run ResiliMap locally.

### ✅ Prerequisites

Make sure the following are installed:

- [Node.js](https://nodejs.org/) (a current supported LTS version is recommended)
- npm (included with Node.js)
- A [Supabase](https://supabase.com/) account and project for backend functionality

### 1️⃣ Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_PROJECT_FOLDER>
```

Replace the placeholders with your GitHub repository URL and project folder name.

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Configure Environment Variables

Create a `.env` file in the project's root directory and add the Supabase project credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
```

The weather endpoint can optionally be overridden:

```env
VITE_WEATHER_API_BASE_URL=https://api.open-meteo.com/v1/forecast
```

Use the exact variable names expected by the application. Never commit `.env` files, database passwords, or Supabase `service_role` keys. Any variable prefixed with `VITE_` is exposed to the browser and must not contain secrets.

### 4️⃣ Configure Supabase

The project uses Supabase for authentication, database access, and private report-evidence storage.

Before using backend-dependent functionality:

1. Create a Supabase project.
2. Configure the project URL and publishable/anon key in `.env`.
3. Configure the authentication redirect URLs for local development and the deployed website.
4. Apply the database migrations in the order documented in [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md).
5. Configure the private storage bucket and its policies as described in that setup guide.

📘 **Important:** Read [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) carefully before setting up a fresh database. It contains the migration sequence, storage configuration, access-control notes, and authority workflow. Check the live Supabase migration history before applying migrations to an existing project; do not blindly rerun migrations.

### 5️⃣ Run the Development Server

```bash
npm run dev
```

Vite will print the local development URL in the terminal. Open that URL in your browser.

### 6️⃣ Create a Production Build

```bash
npm run build
```

The production-ready files are generated in the `dist/` directory.

To preview the production build locally:

```bash
npm run preview
```

## 📜 Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite development server |
| `npm run build` | Creates an optimized production build |
| `npm run preview` | Previews the production build locally |

## 🔐 Security Notes

- Keep `.env` out of version control.
- Never expose Supabase `service_role` keys or database passwords in frontend code.
- Use Supabase Row Level Security (RLS) and the database permissions defined by the project migrations.
- Keep report evidence in the configured private storage bucket.
- Configure authentication redirect URLs for both local development and the deployed application.
- Review the Open-Meteo usage terms and attribution requirements before deployment or commercial use.

## 🌦️ External Data & Services

**Open-Meteo:** The supplied Supabase setup guide documents use of the Open-Meteo Forecast API for modelled current conditions and a five-day daily forecast. The documented free endpoint does not require an API key and is intended for non-commercial use subject to its terms and attribution requirements.

- API: https://api.open-meteo.com/v1/forecast
- Terms: https://open-meteo.com/en/terms
- Pricing: https://open-meteo.com/en/pricing

**Supabase:** Used for authentication, application data, database access policies, and private report evidence storage.

- Documentation: https://supabase.com/docs

## 🔮 Future Scope

Potential enhancements for the platform include:

- 🤖 AI-assisted classification of environmental incident reports.
- 🖼️ Improved image-assisted report review and verification.
- 🔔 More configurable location-based alerts.
- 📈 Advanced historical analytics and risk-trend dashboards.
- 🌧️ Additional environmental data integrations.
- 🏙️ Expansion to more localities and service jurisdictions.
- 🏛️ Further integration with civic and disaster-management workflows.

## 👥 Contributors

Developed with ❤️ by:

| No. | Contributor |
| :---: | --- |
| 1 | **Arya Shinde** |
| 2 | **Mrunal Sagvekar** |
| 3 | **Elissa Quadros** |
| 4 | **Rahul Prajapati** |

## 📂 Additional Documentation

- [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) — Supabase configuration, database migrations, storage setup, security model, and authority workflow.

## 🌍 Our Vision

To empower communities with reliable, localized environmental information and encourage collective action towards safer, better-prepared, and more climate-resilient neighbourhoods.

<div align="center">

### 🗺️ ResiliMap — Map Today. Prepare for Tomorrow. 🌱

**Built with purpose. Driven by community. Designed for resilience.**

[🌐 Open ResiliMap](https://resilimap.vercel.app/)

</div>
"""

output_path = "/mnt/data/README.md"
pypandoc.convert_text(readme, "md", format="md", outputfile=output_path, extra_args=["--standalone"])
print(f"Created updated README with the verified technology stack: {output_path}")
