# NEXGEN_
AI-powered platform for detecting and investigating digital brand impersonation and online threats.

# NEXGEN — AI-Powered Digital Brand Protection

**Detect. Investigate. Protect.**

NEXGEN is an AI-powered digital brand protection platform designed to help organizations identify potential brand impersonation, investigate suspicious digital activity, and manage threats through a centralized workflow.

## 🚀 Key Features

- **Brand Profile Management** — Register and manage brand profiles.
- **Logo Verification** — Submit a brand logo URL as part of registration and brand profile management.
- **Social Media Monitoring** — Track configured social media handles for potential impersonation.
- **Look-Alike Detection** — Identify suspicious domains and digital identities that resemble legitimate brands.
- **Investigation Workflow** — Organize investigations and review detection findings.
- **Threat Reporting** — Generate reports and export report data in supported formats.
- **Report Sharing** — Share reports through the application's report-sharing workflow.
- **Organization Management** — Support organization and membership workflows.
- **Security Controls** — Includes authentication and protections for potentially unsafe server-side requests.

## 🛠️ Technology Stack

- **Frontend:** Next.js, React, TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** SQLite and Supabase integration
- **Testing:** Automated tests using Node.js

## 🏗️ Application Modules

| Module | Purpose |
|---|---|
| Brand Management | Maintain brand profiles and logo information |
| Social Monitoring | Manage social handles and related detection workflows |
| Investigation | Review investigations and collected findings |
| Admin Dashboard | Manage organizations, reports, findings, and security-related workflows |
| Reports | View, export, and share investigation reports |
| Authentication | Support user registration, login, and logout |

## ⚙️ Getting Started

### Prerequisites

- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/sivanibandaruu-22/NEXGEN_.git
cd NEXGEN_
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local `.env.local` file using the environment variable names required by the application. Configure the necessary Supabase settings if you intend to use the Supabase integration.

**Never commit `.env.local`, secret keys, passwords, or other credentials to GitHub.**

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production

```bash
npm run build
```

## 🧪 Testing

Run the automated tests using the scripts and commands configured in the project. Review `package.json` for the available test scripts.

## 🔐 Security Notes

- Keep environment variables and secret keys private.
- Use secure authentication practices.
- Validate user-provided URLs before server-side requests.
- Configure the database and deployment environment before running the application in production.

## 📌 Project Status

Developed as a hackathon project. Deployment readiness depends on the configured database, environment variables, and hosting environment.

## 👥 Team

Add your team members' names here.

## 📄 License

No license has been specified yet.

