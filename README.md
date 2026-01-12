# LIFF Backend Tester

A Vite + React application for testing Supabase Edge Functions within a LIFF (LINE Front-end Framework) environment. This app provides a permanent live testing harness for your Supabase backend.

## Features

- LIFF authentication integration
- Supabase authentication using LINE ID token
- End-to-end testing of Edge Functions:
  - `tenant_bootstrap` (public)
  - `ensure_profile_and_customer` (auth)
  - `availability_search` (auth)
  - `create_hold` (auth)
  - `confirm_booking` (auth)
  - `payment_init` (auth, optional)
- Real-time status monitoring (LIFF login status, Supabase session, user ID)
- JSON request/response viewer with copy functionality
- Interactive slot selection for availability testing

## Prerequisites

- Node.js 18+ and npm/yarn
- A Supabase project with Edge Functions deployed
- A LINE LIFF app configured
- `@supabase/supabase-js` version 2.39.0 or later (for `signInWithIdToken` support)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_LIFF_ID=your_liff_app_id
VITE_TENANT_SLUG=demo
```

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port Vite assigns).

### 4. Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### 5. Deploy to Static Host

Deploy the `dist` directory to any static hosting service:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Any other static host

### 6. Configure LIFF Endpoint URL

1. Go to your LINE Developers Console
2. Navigate to your LIFF app settings
3. Set the LIFF endpoint URL to your deployed app URL
4. Ensure the redirect URI matches your deployment URL

## Usage

1. **Initialization**: The app automatically initializes LIFF and attempts to sign in to Supabase using your LINE ID token.

2. **Status Bar**: Check the top of the app to see:
   - LIFF login status
   - Supabase session status
   - Current user ID

3. **Testing Functions**:
   - **Tenant Context**: Configure tenant slug and optional LIFF ID, then call `tenant_bootstrap`
   - **Setup**: Call `ensure_profile_and_customer` to set up user profile
   - **Availability**: Enter service ID, optional staff ID, and date range to search for available slots
   - **Hold**: Select a slot from availability results and create a hold
   - **Confirm**: Confirm a booking using the hold ID
   - **Payment**: Initialize payment for a confirmed booking

4. **Viewing Results**: Each function call displays:
   - Request JSON
   - Response JSON
   - Error messages (if any)
   - Copy buttons for easy debugging

## Troubleshooting

### Authentication Errors

- **"signInWithIdToken is not available"**: Upgrade `@supabase/supabase-js` to version 2.39.0 or later:
  ```bash
  npm install @supabase/supabase-js@latest
  ```

- **"Failed to get LIFF ID token"**: Ensure you're accessing the app through LIFF and that LIFF initialization completed successfully.

- **"Supabase auth error"**: Check that:
  - Your Supabase project has LINE authentication provider configured
  - The ID token is valid and not expired
  - Your Supabase project URL and anon key are correct

### Function Call Errors

- **401 Unauthorized**: Ensure you're logged in to both LIFF and Supabase (check status bar)
- **404 Not Found**: Verify that your Edge Functions are deployed and named correctly
- **Network errors**: Check that your Supabase project URL is correct and accessible

## Project Structure

```
src/
  lib/
    supabase.js      # Supabase client initialization
    liffAuth.js      # LIFF authentication helpers
    api.js           # Edge Function API wrappers
  components/
    StatusBar.jsx    # Status display component
    JsonPanel.jsx    # JSON viewer component
  App.jsx            # Main application component
  main.jsx           # Application entry point
  index.css          # Application styles
```

## License

MIT
