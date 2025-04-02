# Slack Projector - Project Overview

## Purpose
A Next.js application that receives Zoom meeting transcripts and automatically sends them to meeting hosts via Slack DM.

## Architecture

### Tech Stack
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (via Supabase) ✅
- **Authentication**: Zoom OAuth ✅
- **Integrations**: Zoom API, Slack API

### Key Components
1. **Zoom Integration** ✅
   - OAuth for app installation
   - Token storage
   - Webhook handling for transcripts

2. **Slack Integration**
   - User lookup by email
   - DM sending capability

### Database Schema

#### zoom_users ✅
```sql
CREATE TABLE zoom_users (
    id SERIAL PRIMARY KEY,
    zoom_user_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

## API Endpoints

### Zoom Integration
- `GET /api/zoom/auth` ✅
  - Initiates Zoom OAuth flow
- `GET /api/zoom/callback` ✅
  - Handles OAuth callback
  - Stores user tokens
- `POST /api/notification`
  - Handles transcript webhooks
  - Downloads transcripts
  - Sends Slack DMs

## User Flow
1. Admin installs app via Zoom Marketplace
2. App stores OAuth tokens
3. When meeting ends and transcript is ready:
   - Zoom sends webhook
   - App downloads transcript
   - App finds user in Slack by email
   - App sends transcript via Slack DM

## Environment Variables
Required environment variables:
- `ZOOM_CLIENT_ID` ✅
- `ZOOM_CLIENT_SECRET` ✅
- `ZOOM_WEBHOOK_SECRET_TOKEN`
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `SLACK_BOT_TOKEN`

## Development Setup
1. Clone repository
2. Install dependencies
3. Set up environment variables
4. Initialize database schema
5. Configure Zoom app settings
6. Start development server

## Next Steps
- [x] Implement OAuth routes
- [x] Set up database connection
- [x] Implement token storage
- [ ] Implement session management
- [ ] Set up Slack integration
- [ ] Add transcript processing logic
- [ ] Create user interface
- [ ] Add error handling and monitoring
