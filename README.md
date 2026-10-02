# Gamified Todo

A personal, browser-only todo app: one-off tasks and recurring habits earn points, keep a daily streak (with one freeze per week), unlock levels and badges, and can be spent on rewards you define. Includes a 12-month completion heatmap and JSON export/import. Installable as a PWA and works offline.

## Develop

    npm install
    npm run dev        # http://localhost:5173
    npm test           # unit + component tests
    npm run build      # type-check + production build into dist/

## Data

Everything is stored in your browser's localStorage — there is no server. Use **Progress → Export data** to back up or move to another device; clearing site data deletes your progress.

## Deploy

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`.
One-time setup: repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Design: `docs/superpowers/specs/2026-10-02-gamified-todo-design.md`.
