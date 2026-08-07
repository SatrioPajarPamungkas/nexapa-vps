# Nexapa API — Agent Rules

## Purpose

Nexapa API is the standalone backend for Nexapa Web and future Nexapa Desktop.

It manages:

- users and workspaces
- download jobs
- media records
- connected account references
- publishing jobs
- schedules
- affiliate data
- activity history
- encrypted integration settings
- communication with dedicated workers

This project is separate from:

- nexapa-web
- nexapa-worker
- website-perusahaan

Do not modify files outside this repository.

## Technology

- Laravel
- PHP
- SQLite for initial local development
- Database queue for initial local development
- Laravel Sanctum for API authentication
- REST JSON API

## Current Phase

Build the API foundation and Downloader job contract first.

Do not implement yet:

- OAuth
- platform publishing
- real browser sessions
- raw cookie storage
- proxy execution
- scheduler execution
- affiliate synchronization
- payment
- subscription billing

## Architecture

Use clear domain-oriented structure.

Preferred directories:

app/
├── Enums/
├── Http/
│   ├── Controllers/Api/
│   ├── Requests/
│   └── Resources/
├── Jobs/
├── Models/
├── Policies/
├── Services/
└── Support/

Do not put business logic directly inside controllers.

Controllers should:

- authorize
- validate requests
- call services
- return resources

## API Rules

- API responses must use JSON.
- Use consistent success and error structures.
- Use Form Request validation.
- Use API Resources.
- Never return stack traces in production responses.
- Never expose secrets.
- Never trust frontend status values.
- Backend controls all job state transitions.

## Downloader Rules

One unified Downloader supports all platforms.

Do not create separate TikTok, Facebook, Instagram, or YouTube downloader APIs.

Use generic endpoints and typed platform detection.

Downloader must eventually support:

- single URL
- multiple URLs
- profile/channel/playlist analysis
- mass result selection
- format and quality
- delay
- queue
- progress
- retry
- cancellation
- Media Library output
- multiple platforms supported by the worker

## Security

Never store:

- plain-text passwords
- plain-text client secrets
- raw tokens without encryption
- raw cookies without encryption
- proxy passwords without encryption

Do not log:

- authorization headers
- cookies
- access tokens
- client secrets
- media signed URLs
- proxy credentials

## Queue

Use Laravel database queue initially.

Job execution belongs to dedicated workers.

Laravel API creates and manages jobs but must not directly run yt-dlp inside HTTP requests.

## Package Management

Use Composer for PHP dependencies.

Do not introduce unnecessary packages.

## Validation

After implementation, use:

- php artisan migrate:fresh
- php artisan route:list
- php artisan test only when tests are explicitly requested
- php artisan optimize:clear

Do not modify Nexapa Web from this repository.

## Final Report

Report:

- architecture created
- models and migrations
- API routes
- validation
- services
- queue contract
- files created
- files changed
- commands run
- remaining worker requirements