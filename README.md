# Belluna — Women's Health Companion 🌸

**Understand your health. Track your patterns. Know when to seek help.**

Belluna is a bilingual women's healthcare web application built for **recHERsion 2026 — Problem Statement 1: Women's Healthcare**. It brings AI-powered health education, menstrual and symptom tracking, and safety-oriented guidance together in one accessible platform.

🔗 **Live Demo:** [Try Belluna](https://belluna-her-verse.vercel.app/)

## 💡 The Problem

Women's health concerns are often misunderstood, symptoms can be normalised, and reliable medical information may be difficult to understand or access. Language barriers can make these challenges even harder.

Belluna aims to make health information easier to understand and help users make more informed decisions about their healthcare.

## ✨ Key Features

- **AI Health Translator:** Understand health-related information through simple explanations in Hindi, English, and Hinglish, with health references and safety guidance.
- **Period & Symptom Tracker:** Record menstrual cycles and symptoms and review personal health history.
- **Period SOS:** Provides safety-oriented guidance to help users identify appropriate next steps.
- **Nearby Healthcare Finder:** Explore nearby healthcare facilities using map services.
- **Authentication & Privacy:** Uses Supabase authentication and database security policies to protect private user records.
- **Health Awareness:** Makes educational information about women's health more accessible.

*Feature availability may vary. Refer to the live application for currently accessible functionality.*

## 🚀 What Makes Belluna Different?

- Combines health education, personal tracking, and guidance in one platform.
- Supports Hindi, English, and Hinglish for greater language accessibility.
- Uses a server-side AI integration to keep the Groq API key out of frontend code.
- Emphasises responsible health information, trusted references, and appropriate medical escalation.

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, TypeScript |
| UI | Tailwind CSS, shadcn/ui |
| Authentication & Database | Supabase |
| AI Integration | Groq API |
| Maps | Leaflet, OpenStreetMap, Overpass API |
| Testing | Vitest |
| Deployment | Vercel |

## ⚙️ Run Locally

### Prerequisites

- Node.js and npm
- Git
- A Supabase project
- A Groq API key for AI features

### 1. Clone the repository

```bash
git clone https://github.com/PriyanshiShrotriya/Belluna-HerVerse.git
cd Belluna-HerVerse/belluna
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create the required `.env` and `.dev.vars` files using the project's example environment files, if available.

Configure the variables required by your implementation, including:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GROQ_API_KEY`
- `GROQ_MODEL`

Use the correct values from your Supabase and Groq projects. Keep secret keys out of frontend code and never commit them to GitHub.

### 4. Set up the database

Configure your Supabase project and apply the required database migrations. Enable the authentication settings needed by the application.

### 5. Start the application

Run the frontend:

```bash
npm run dev
```

In a separate terminal, start the local API server:

```bash
npm run server
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

### 6. Test and build

```bash
npm test
npm run build
```

## 🏗️ Architecture

```text
React + Vite Frontend
        |
        +---- Supabase Auth & PostgreSQL
        |
        +---- /api/explain ---- Groq API
        |
        +---- /api/overpass -- Overpass API
```

The frontend provides the user interface, Supabase supports authentication and database operations, and server-side API endpoints handle AI requests and map-data queries.

## 🔒 Healthcare Safety & Privacy

- Belluna provides general health education, not medical diagnoses or prescriptions.
- AI-generated information may be inaccurate and should not replace professional medical advice.
- API secrets are kept server-side.
- Private database records should be protected by appropriate Supabase Row Level Security policies.
- Use synthetic data for public demonstrations.

**Medical disclaimer:** Belluna is not a substitute for a qualified healthcare professional. In an emergency in India, call **112** or seek immediate medical attention.

## 👩‍💻 Team

Built collaboratively by a three-member team for **recHERsion 2026**.

- **AI & Healthcare Intelligence:** Translator, AI integration, and health information safety.
- **Backend & Health Tracking:** Supabase, authentication, and tracking functionality.
- **Frontend & Integration:** User interface, healthcare finder, safety experience, and application integration.

## 📚 Documentation

See the `docs/` directory for additional project information:

- `requirements.md` — Requirements and acceptance criteria
- `architecture.md` — Technical architecture and data model
- `phases.md` — Development phases and integration checkpoints
- `rules.md` — Team conventions and development guidelines

## ⚠️ Limitations

- AI responses may be incomplete or inaccurate.
- Healthcare facility information depends on external map data and may not be complete.
- Availability depends on external services and their usage limits.
- Belluna is a hackathon project and is not a clinically validated diagnostic system.

## 🙏 Acknowledgements

Built with React, Vite, Supabase, Groq, and OpenStreetMap technologies. Health information references are provided where applicable.
