# Nexapa Web — Agent Rules

## Project Purpose

Nexapa is a standalone web application for media workflow, connected accounts, publishing, scheduling, affiliate management, and activity history.

This project is separate from:

- website-perusahaan
- Nexapa Desktop/Tauri
- Nexapa API

Do not modify any project outside this repository.

## Technology

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide React
- Bun package manager

## Package Manager

Use Bun only.

Allowed:

- bun install
- bun add
- bun run dev
- bun run build
- bun run lint

Do not use:

- npm
- yarn
- pnpm

Do not generate package-lock.json, yarn.lock, or pnpm-lock.yaml.

## Current Phase

The current phase is frontend architecture and application shell only.

Do not create:

- backend services
- Laravel project
- database
- authentication server
- API endpoints
- TikTok/Facebook integrations
- Playwright workers
- upload workers
- scheduler workers
- payment integration
- fake production data

Use static or mock frontend data until a Nexapa API is created separately.

## Architecture

Use feature-based organization.

Preferred structure:

src/
├── app/
├── assets/
├── components/
│   ├── common/
│   ├── feedback/
│   └── navigation/
├── features/
├── layouts/
├── lib/
├── pages/
├── router/
├── styles/
└── types/

Each main menu must have its own page file.

Required pages:

- Login
- Dashboard
- Downloader
- Media Library
- Connected Accounts
- Publisher
- Scheduler
- Affiliate
- History
- Settings

Do not combine all page content into App.tsx.

## Component Rules

- Keep components focused and reusable.
- Keep page-specific code in its own page or feature folder.
- Do not create huge components.
- Do not duplicate navigation markup.
- Use one shared authenticated application layout.
- Use one shared sidebar.
- Use one shared topbar.
- Use semantic HTML.
- Keep keyboard navigation accessible.

## Styling

- Use Tailwind CSS.
- No inline style attributes unless technically required for calculated values.
- No embedded style blocks.
- Keep a professional SaaS dashboard visual language.
- Use navy, blue, cyan, white, and subtle neutral colors.
- Avoid excessive gradients, glow, blur, and animation.
- Responsive desktop, tablet, and mobile behavior is mandatory.
- Prevent page-level horizontal overflow.

## Routing

Use React Router.

Routes must be centralized.

Do not hardcode navigation behavior across components.

Required initial routes:

- /login
- /dashboard
- /downloader
- /library
- /accounts
- /publisher
- /scheduler
- /affiliate
- /history
- /settings

Unknown routes must render a proper Not Found page.

## Data and API

Do not call a real backend yet.

Create one API boundary for future use, such as:

src/lib/api.ts

Use:

VITE_NEXAPA_API_BASE_URL

Do not hardcode production URLs.

Do not store sensitive tokens, cookies, passwords, or platform sessions in localStorage.

## Safety

- Do not invent API functionality.
- Do not invent download results.
- Do not claim publishing succeeded.
- Do not implement fake authentication as if it were secure.
- Do not copy Rust or Tauri-specific code into the browser.
- Do not expose cookies or account sessions.
- Do not modify files outside this repository.
- Do not install unnecessary dependencies.
- Do not make broad repository scans when targeted reads are enough.

## Workflow

Before editing:

1. Read this AGENTS.md.
2. Inspect only files needed for the task.
3. Summarize the intended changes briefly.
4. Apply actual edits.
5. Run the required validation.

Validation:

- bun run build
- bun run lint when available

## Final Report

Report only:

- work completed
- files created
- files changed
- routes created
- responsive behavior
- command results
- remaining risks
