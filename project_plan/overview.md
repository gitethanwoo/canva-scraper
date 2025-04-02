# Slack Projector - Project Overview

## Purpose
A Next.js application that integrates Zoom recordings with Slack, automatically processing meeting transcripts and making them searchable and shareable within Slack channels.

## Architecture

### Tech Stack
- **Frontend**: Next.js
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (via Supabase) ✅
- **Authentication**: Zoom OAuth ✅
- **Integrations**: Zoom API, Slack API

### Key Components
1. **Webhook Handler** (`app/api/notification/route.ts`)
   - Processes Zoom webhook notifications
   - Handles transcript completion events
   - Validates webhook signatures

2. **OAuth Flow** ✅
   - Manages Zoom user authentication
   - Stores user tokens securely
   - Handles token refresh
   - Success/Error pages for user feedback

3. **Token Management** ✅
   - Secure token storage in Supabase
   - Automatic token refresh mechanism
   - Token expiration handling
   - User info management

4. **Session Management**
   - User session tracking
   - Protected route middleware
   - Session-based user identification
   - Secure cookie management
   - API route protection

## Database Schema

### zoom_users ✅
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

### sessions
```sql
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    zoom_user_id TEXT NOT NULL REFERENCES zoom_users(zoom_user_id),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

### meetings
```sql
CREATE TABLE meetings (
    id SERIAL PRIMARY KEY,
    zoom_meeting_id TEXT UNIQUE NOT NULL,
    zoom_user_id TEXT NOT NULL REFERENCES zoom_users(zoom_user_id),
    topic TEXT,
    start_time TIMESTAMP,
    duration INTEGER,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

### transcripts
```sql
CREATE TABLE transcripts (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES meetings(id),
    recording_start TIMESTAMP,
    recording_end TIMESTAMP,
    file_type TEXT,
    download_url TEXT,
    transcript_status TEXT DEFAULT 'pending',
    transcript_content JSONB,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

## API Endpoints

### Zoom Webhooks
- `POST /api/notification`
  - Handles Zoom webhook events
  - Processes transcript completion notifications
  - Validates webhook signatures

### OAuth ✅
- `GET /api/zoom/auth`
  - Initiates Zoom OAuth flow
  - Sets secure state cookie for CSRF protection
  - Redirects to Zoom authorization page
- `GET /api/zoom/callback`
  - Handles OAuth callback
  - Validates state parameter
  - Exchanges code for tokens
  - Stores user tokens and info
  - Creates user session

### Token Management ✅
- `lib/zoom-token.ts`
  - Handles token storage and retrieval
  - Manages token refresh flow
  - Provides valid access tokens for API calls

### Session Management
- `middleware.ts`
  - Protects API routes
  - Validates user sessions
  - Handles session expiration
  - Manages secure cookies
- `lib/session.ts`
  - Session creation and validation
  - User context management
  - Session storage in database

## Authentication Flows

### Zoom OAuth Flow ✅
1. User initiates auth via Slack or web interface
2. Redirect to Zoom auth URL with:
   - `response_type=code`
   - `client_id`
   - `redirect_uri`
   - `state` for security
3. Handle callback with auth code
4. Exchange code for access/refresh tokens
5. Store tokens in database ✅
6. Fetch user info from Zoom API ✅
7. Create user session

### Session Flow
1. User authenticates via OAuth
2. Create secure session in database
3. Set secure HTTP-only cookie
4. Validate session on each request
5. Refresh session as needed
6. Clear session on logout

### Webhook Authentication
- Validate Zoom webhook signatures
- Use environment variable `ZOOM_WEBHOOK_SECRET_TOKEN`
- Implement crypto validation

## Environment Variables
Required environment variables:
- `ZOOM_CLIENT_ID` ✅
- `ZOOM_CLIENT_SECRET` ✅
- `ZOOM_WEBHOOK_SECRET_TOKEN`
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `SESSION_SECRET_KEY`

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
