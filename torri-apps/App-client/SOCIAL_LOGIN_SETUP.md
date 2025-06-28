# Social Login Setup Guide

## Overview
This guide explains how to configure Google and Facebook social login for the TorriApps PWA client.

## Prerequisites
- Google Cloud Console account
- Facebook Developer account
- Google Cloud Storage bucket configured (for production)

## Backend Configuration

### 1. Environment Variables
Add the following environment variables to your backend `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth Configuration  
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# File Storage (for profile pictures)
USE_CLOUD_STORAGE=true  # Set to false for local development
```

### 2. Database Migration
Run the database migration to add social login fields:

```bash
cd Backend/
alembic upgrade head
```

### 3. Install Dependencies
Install the new Python dependencies:

```bash
pip install -r Requirements.txt
```

## Frontend Configuration

### 1. Environment Variables
Create a `.env.local` file in the App-client directory:

```env
# Google Configuration
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# Facebook Configuration
VITE_FACEBOOK_APP_ID=your-facebook-app-id
```

### 2. Install Dependencies
Install the new Node.js dependencies:

```bash
cd App-client/
npm install
```

## Google OAuth Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API and Google Identity APIs

### 2. Configure OAuth Consent Screen
1. Go to APIs & Services > OAuth consent screen
2. Configure your app information
3. Add authorized domains:
   - `localhost` (for development)
   - Your production domain

### 3. Create OAuth Client ID
1. Go to APIs & Services > Credentials
2. Create OAuth 2.0 Client ID
3. Application type: Web application
4. Authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - `https://your-domain.com` (for production)
5. Authorized redirect URIs:
   - `http://localhost:5173/auth/google/callback`
   - `https://your-domain.com/auth/google/callback`

## Facebook OAuth Setup

### 1. Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product

### 2. Configure Facebook Login
1. Go to Facebook Login > Settings
2. Set Valid OAuth Redirect URIs:
   - `http://localhost:5173/auth/facebook/callback`
   - `https://your-domain.com/auth/facebook/callback`
3. Configure App Domains:
   - `localhost` (for development)
   - `your-domain.com` (for production)

### 3. App Review
For production, submit your app for review to access user email and public profile.

## Testing

### Development Testing
1. Start the backend server:
   ```bash
   cd Backend/
   uvicorn main:app --reload
   ```

2. Start the frontend development server:
   ```bash
   cd App-client/
   npm run dev
   ```

3. Navigate to the login page and test social login buttons

### Production Deployment
- Ensure all environment variables are set correctly
- Update OAuth configurations with production URLs
- Run database migrations on production database

## Features Implemented

✅ **Google Sign-In Integration**
- OAuth 2.0 flow with ID token verification
- Automatic user creation/login
- Profile information extraction

✅ **Facebook Login Integration**  
- Facebook SDK integration
- Token verification with Facebook Graph API
- User profile data extraction

✅ **User Management**
- Automatic account creation for new social users
- Linking social accounts to existing email accounts
- Profile picture download and upload

✅ **UI Components**
- Professional social login buttons with logos
- Loading states and error handling
- Responsive design

✅ **Backend API**
- RESTful endpoints for social authentication
- JWT token generation
- Database models for social login fields

✅ **File Upload System**
- Automatic profile picture download from social providers
- Image processing and optimization
- Google Cloud Storage integration

## Security Considerations

- All tokens are verified server-side
- Social provider tokens are not stored
- Profile pictures are processed and optimized before storage
- User accounts are created with secure default settings

## Troubleshooting

### Common Issues

1. **Google Sign-In not working**
   - Check that Google Client ID is correctly set
   - Verify authorized origins in Google Console
   - Ensure Google SDK is loaded properly

2. **Facebook Login not working**
   - Verify Facebook App ID configuration
   - Check app is in development/live mode
   - Ensure app has necessary permissions

3. **Profile picture upload fails**
   - Check Google Cloud Storage configuration
   - Verify bucket permissions
   - Check file size limits (2MB max)

4. **Database errors**
   - Run database migration: `alembic upgrade head`
   - Check database connection
   - Verify social login fields exist in users table