# Nexapa Web

Nexapa is a media workflow platform for content management, connected accounts, publishing, scheduling, affiliate operations, and activity tracking.

## Overview

- Product name: Nexapa
- Frontend package: nexapa-web
- Primary app domain: nexapa.app (planned)
- Brand/marketing domain: nexapa.me (planned)
- Future API domain: api.nexapa.app

This repository contains the frontend application shell only.

Current phase: frontend shell with no backend connectivity.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide React
- Bun package manager

## Package Manager

Bun only.

```bash
bun install
bun run dev
bun run build
bun run lint
```

Do not use npm / yarn / pnpm.
Do not generate package-lock.json.

## Environment Variables

Example configuration only — no real API calls are performed.

```env
VITE_NEXAPA_API_BASE_URL=https://api.nexapa.app/api
```

See `.env.example` for the canonical example.

- Do not create a real `.env` file with secrets in this task.
- Do not hardcode production URLs in source.

## Routes

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

Unknown routes render Not Found.

## Frontend Shell Status

- Awaiting backend
- Not connected
- No data
- Not configured
- Frontend shell only

No claims are made that backend, login, publishing, downloader, or accounts are operational at this stage.
