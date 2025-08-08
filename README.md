Domain Scout – Domain Availability & Intelligence App

Setup

1. Install deps: `pnpm install`
2. Copy `.env.local` and set keys:

```
DOMAINR_API_KEY=YOUR_DOMAINR_KEY
TLDLIST_API_KEY=YOUR_TLDLIST_KEY
SCREENSHOTONE_API_KEY=YOUR_SCREENSHOTONE_KEY
NEXT_PUBLIC_APP_NAME=Domain Scout
```

If keys are missing, the app runs in DEMO_MODE with mocked data for `example.com`, `openai.com`, and `mycoolstartup.io`.

3. Dev: `pnpm dev`

Deploy

Deploy on Vercel. Ensure env vars are configured. No API keys are exposed to the client; all calls are server-side.
