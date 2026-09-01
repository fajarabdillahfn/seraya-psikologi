# Deploy env vars

Copy `.dev.vars.example` to `.dev.vars` (gitignored) and fill in real values:

```
# Cloudflare API token (https://dash.cloudflare.com/profile/api-tokens)
CLOUDFLARE_API_TOKEN=***

# Cloudflare Account ID
CLOUDFLARE_ACCOUNT_ID=ff1583ef05501c72895de6256b7e8e72

# Midtrans Snap server key (https://dashboard.midtrans.com)
MIDTRANS_SERVER_KEY=***

# Google OAuth client (https://console.cloud.google.com/apis/credentials)
GOOGLE_OAUTH_CLIENT_ID=***
GOOGLE_OAUTH_CLIENT_SECRET=***

# Email provider (Postmark, Resend, SendGrid, etc.)
EMAIL_PROVIDER_API_KEY=***

# Allow placeholder admin auth in dev only
ALLOW_PLACEHOLDER_ADMIN_AUTH=true
```

Set them on Cloudflare Workers:

```
npx wrangler secret put MIDTRANS_SERVER_KEY
npx wrangler secret put GOOGLE_OAUTH_CLIENT_ID
npx wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET
npx wrangler secret put EMAIL_PROVIDER_API_KEY
```

Then deploy:

```
npx wrangler deploy
```

The MVP Worker runs at:
- Production: https://seraya-psikologi.<account>.workers.dev

The static docs site runs at:
- https://seraya-psikologi-docs.pages.dev
