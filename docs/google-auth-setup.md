# Google Identity Services (OAuth 2.0) Setup Guide

This document describes how to configure Google OAuth 2.0 for **LumaSpend** on both backend and frontend.

---

## 1. Google Cloud Console Setup

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your Google Cloud Project or create a new project named **LumaSpend**.
3. Go to **APIs & Services** > **OAuth consent screen**:
   * **User Type:** External (or Internal if G-Suite workspace only).
   * **App Name:** `LumaSpend`
   * **User support email:** Your email.
   * **Developer contact information:** Your email.
   * **Scopes:** `email`, `profile`, `openid`.
4. Go to **APIs & Services** > **Credentials**:
   * Click **Create Credentials** > **OAuth client ID**.
   * **Application type:** Web application.
   * **Name:** `LumaSpend Web Client`.
   * **Authorized JavaScript origins:**
     * `http://localhost:5173` (Vite development server)
     * `http://localhost:5000` (Local Express API)
     * `https://your-production-domain.com` (Production domain)
   * **Authorized redirect URIs:**
     * `http://localhost:5173`
     * `https://your-production-domain.com`
5. Copy your **Client ID** (it looks like `xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com`).

---

## 2. Environment Variables Configuration

### Backend (`server/.env`)
Add your OAuth client ID to `server/.env`:
```env
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

### Frontend (`client/.env`)
Add the public client ID to `client/.env`:
```env
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

---

## 3. Server-Side Verification Security Architecture

LumaSpend verifies Google identities using Google's official `google-auth-library`:
* **Audience Check:** Validates that the token was explicitly issued for your `GOOGLE_CLIENT_ID` (prevents cross-client token re-use attacks).
* **Issuer Check:** Must match `accounts.google.com` or `https://accounts.google.com`.
* **Expiration Check:** Rejects expired tokens.
* **Email Verification Check:** Confirms `email_verified: true` before linking or creating accounts.

---

## 4. Development & Testing Notice
* When `GOOGLE_CLIENT_ID` is unconfigured, the application uses a simulated token (`mock-google-token:<email>`) strictly in `development` and `test` environments.
* In `production`, development mocks are strictly disabled and rejected with an explicit error.
