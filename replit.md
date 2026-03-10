# Waqt - AI-Powered Calendar App

## Overview
Waqt is a minimalistic AI-powered calendar app for iOS. Users can rant about their schedule in natural language and AI converts it into organized calendar events with colors, categories, and priorities. Includes a task list with completion tracking and calendar-task linking.

## Tech Stack
- **Frontend**: Expo (React Native) with Expo Router, TypeScript
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations
- **Fonts**: Inter (Google Fonts)

## Architecture
- `app/` - Expo Router screens (file-based routing)
  - `(tabs)/` - Main tab screens (Calendar, Tasks, AI Rant, Settings)
  - `onboarding.tsx` - Personalized onboarding flow (generates recurring schedule events)
  - `day-detail.tsx` - Day detail sheet with hourly timeline (formSheet modal)
  - `create-event.tsx` - Manual event creation modal (formSheet)
- `components/` - Reusable UI components
  - `calendar/` - MonthView, HourlyTimeline, DayView components
- `contexts/` - React Context providers (AppContext)
- `constants/` - Theme colors with green accent
- `server/` - Express API backend
  - `routes.ts` - API routes (profile, events, tasks, AI parsing)
  - `storage.ts` - Database storage layer
  - `db.ts` - Database connection
- `shared/` - Shared types and schema (Drizzle)
- `lib/` - Query client utilities

## Key Features
1. Personalized onboarding (name, student/worker, schedule)
2. Natural language event creation via AI ("rant-to-events")
3. Monthly calendar view with Google Calendar-style event preview boxes (colored chips with titles, "+N more")
4. Day-detail sheet (formSheet modal) with hourly timeline — opens on date tap
5. Current time indicator (red line) with auto-scroll to now
6. Manual event creation via floating + button on calendar and day-detail sheet
7. Onboarding schedule-based recurring event generation (4 weeks of school/work events)
8. Task list tab (iOS Reminders-style) with progress bar, categories, priorities
9. Task completion with checkbox toggle and haptic feedback
10. Calendar-task linking (tasks shown under linked events in timeline)
11. Settings with notification toggle and profile info

## Theme
- Green accent (#3D9970) on light/dark backgrounds
- Minimalistic, clean UI inspired by leading mobile apps
- Inter font family

## Device Isolation
- Each device (web preview, Expo Go on phone) gets a unique `deviceId` stored in AsyncStorage (`mujo_device_id`)
- All API requests include `X-Device-Id` header to scope data per device
- `deviceId` column exists on `user_profiles`, `events`, and `tasks` tables
- Reset Profile deletes profile + events + tasks from DB via `DELETE /api/profile`

## Database Schema
- `user_profiles` - deviceId, name, type (student/working), schedule details
- `events` - deviceId, title, date, time, category, color, priority
- `tasks` - deviceId, title, notes, dueDate, dueTime, category, color, priority, completed, completedAt, linkedEventId

## PWA (Progressive Web App)
- Web manifest at `public/manifest.json` with app name, theme color (#3D9970), standalone display
- Service worker (`public/sw.js`) caches static assets, network-first for API calls
- Service worker registration in `lib/register-sw.ts`, called from root layout
- Custom HTML head in `app/+html.tsx` with manifest link, theme-color, apple-mobile-web-app meta tags
- PWA icons at `public/icon-192.png` and `public/icon-512.png`
- Install prompt in Settings tab (web only) — detects `beforeinstallprompt` event
- Backend serves `public/` directory as static files

## Deployment / Web Build
- Build process: `scripts/build.js` builds both native Expo Go bundles AND Expo web export (`npx expo export --platform web`)
- Web build output goes to `dist/` directory with production HTML/JS/CSS
- Build script automatically copies PWA files from `public/` to `dist/` and injects PWA meta tags into `dist/index.html`
- Server detects `dist/index.html` at startup — if present, serves web app for browser visitors; if not, falls back to Expo Go landing page
- Landing page (QR code for Expo Go) still accessible at `/landing`
- Expo Go native clients (with `expo-platform` header) still get manifests from `static-build/`
- Deployment config: autoscale with `npm run expo:static:build && npm run server:build` as build step

## API Endpoints
- `GET/POST /api/profile` - User profile CRUD (scoped by X-Device-Id header)
- `PUT /api/profile/:id` - Update profile
- `DELETE /api/profile` - Delete profile + events + tasks for device
- `GET/POST /api/events` - Events CRUD (scoped by X-Device-Id header)
- `PUT/DELETE /api/events/:id` - Update/delete events
- `POST /api/events/batch` - Batch create events (scoped by X-Device-Id header)
- `POST /api/parse-rant` - AI natural language parsing (streaming SSE)
- `GET/POST /api/tasks` - Tasks CRUD (scoped by X-Device-Id header)
- `PUT/DELETE /api/tasks/:id` - Update/delete tasks
- `PATCH /api/tasks/:id/toggle` - Toggle task completion
