# OAuth Integration Guide

## Overview
Added GitHub OAuth login/signup method to the authentication system.

## Features
- **Single Sign-On**: Users can login/signup with GitHub
- **Auto Account Creation**: Automatically creates accounts on first OAuth login
- **Email Linking**: Links OAuth accounts to existing users by email
- **Auto Email Verification**: OAuth emails are pre-verified (no OTP needed)
- **Unified Tokens**: OAuth users receive the same JWT access/refresh tokens

## Setup Instructions

### GitHub OAuth Setup

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - Application name: Your app name
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/auth/github/callback`
4. Copy **Client ID** and **Client Secret**

### Environment Variables (.env)

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Frontend
FRONTEND_URL=http://localhost:3001
```

## Usage

### Frontend Integration

1. Create login button that links to:
   - `http://localhost:3000/auth/github`

2. After OAuth completes, user is redirected to:
   ```
   {FRONTEND_URL}/auth-success?accessToken=...&refreshToken=...
   ```

3. Extract tokens from URL query params and store locally

### Backend Endpoints

- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - Google callback handler
- `GET /auth/github` - Initiate GitHub OAuth flow
- `GET /auth/github/callback` - GitHub callback handler

## API Response After OAuth

Redirect URL contains tokens:
```
http://localhost:3001/auth-success?accessToken=eyJ...&refreshToken=eyJ...
```

Use these tokens like regular login tokens for subsequent requests.

## Account Linking

If user already has an account with their OAuth email:
- OAuth account is linked to existing user
- User gains additional login method
- All data remains intact

## Database Changes

Added columns to `users` table:
- `oauthProvider` - Provider name ('github')
- `oauthId` - GitHub's user ID

## Security Notes

- OAuth passwords are empty (`password: ''`)
- Email is auto-verified for OAuth users
- Refresh tokens are hashed and stored
- Same JWT strategy used for all auth methods
- CORS configured to allow frontend redirects
