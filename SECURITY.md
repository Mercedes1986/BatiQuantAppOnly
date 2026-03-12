
# Security Architecture & Compliance

This document outlines the security measures implemented for the BatiCalc Pro application deployed on Vercel.

## 1. Security Headers (Vercel)

Headers are enforced globally via `vercel.json`.

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; ...` | Enforces HTTPS connection. |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-sniffing attacks. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Protects traffic source data. |
| `Permissions-Policy` | `camera=(), ...` | Disables unused browser features (Cam, Mic, Geo). |
| `Content-Security-Policy` | *(See below)* | Controls resource loading and framing. |

## 2. Content Security Policy (CSP)

The CSP is designed to be **Strict yet Compatible** with the current architecture (Tailwind CDN + AI Studio Preview).

**Policy Details:**
*   **Scripts**: Allowed from `self`, `cdn.tailwindcss.com`, and `esm.sh`. `unsafe-inline` is permitted for Tailwind initialization.
*   **Styles**: Allowed from `self`, `cdn.tailwindcss.com`, and `fonts.googleapis.com`.
*   **Framing**: `frame-ancestors *` is strictly enabled to allow **Google AI Studio** and **Vercel Previews** to render the application in an iframe.
    *   *Note for Prod*: In a strict standalone environment, change this to `frame-ancestors 'self'`.

## 3. Supply Chain & Data

*   **Client-Side Only**: No database or backend servers are used.
*   **LocalStorage**: User data (projects, quotes) is stored locally in the browser. No sensitive tokens or PII are collected.
*   **Dependencies**: All major logic is bundled or served via reputable CDNs (`esm.sh`).

## 4. Validation Checklist

To verify security posture after deployment:

1.  **Headers Check**:
    *   Open DevTools -> Network -> Click main document request.
    *   Verify `Strict-Transport-Security` is present.
    *   Verify `Content-Security-Policy` is present.

2.  **CSP Functionality**:
    *   Console should NOT show red errors regarding `Refused to load script...`.
    *   Tailwind styles should load correctly.

3.  **Preview Compatibility**:
    *   The app should be visible inside the Google AI Studio preview pane (Iframe).
    *   If the screen is white/refused, check `frame-ancestors` in `vercel.json`.

## 5. Incident Response

If the UI breaks due to CSP blocking a new library:
1.  Identify the blocked domain in the Browser Console.
2.  Update `script-src` or `connect-src` in `vercel.json`.
3.  Redeploy.
