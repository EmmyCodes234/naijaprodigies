# Netlify Deployment Guide

Your project is now ready for Netlify!

## 1. Project Setup
I have created the `public/_redirects` file which is critical for React apps. It ensures that when you refresh a page like `/feed`, Netlify serves the main app instead of a 404 error.

## 2. Deployment Steps
1.  **Log in to Netlify**.
2.  Click **"Add new site"** > **"Import an existing project"**.
3.  Select **GiHub**.
4.  Choose your repository: `EmmyCodes234/naijaprodigies`.
5.  **Build Settings** (should be auto-detected, but verify):
    -   **Base directory**: (Leave empty or `/`)
    -   **Build command**: `npm run build`
    -   **Publish directory**: `dist`
6.  **Environment Variables**:
    -   Click **"Add environment variables"**.
    -   Add all key/value pairs from your `.env.local` file:
        -   `VITE_SUPABASE_URL`
        -   `VITE_SUPABASE_ANON_KEY`
        -   `GEMINI_API_KEY` (if used)
7.  Click **"Deploy"**.

## 3. Verify PWA
Once deployed, verify that the `sw.js` is loading and the "Install App" prompt appears.
