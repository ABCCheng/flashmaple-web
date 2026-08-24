# FlashMaple

FlashMaple is a multilingual Canadian news web app for newcomers. It brings local stories, immigration updates, practical information, and regional alerts into one focused reading experience.

![FlashMaple preview](public/og.png)

## Highlights

- Flash briefings, category exploration, search, and favorites
- Regional feeds for seven Canadian cities
- Interfaces in English, French, Simplified Chinese, Traditional Chinese, Punjabi, Spanish, Japanese, Korean, Russian, and Vietnamese
- Browser push notifications with an in-app notification center
- Email and OAuth sign-in flows with PKCE
- Text-to-speech playback and configurable voice settings
- Installable PWA with responsive desktop and mobile layouts
- Light, dark, and mood themes

## Tech stack

- [Next.js 16](https://nextjs.org/) App Router and standalone output
- [React 19](https://react.dev/) and TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/), shadcn, and Lucide icons
- Service Worker, Web Push, and browser storage APIs

This repository contains the web client. News, authentication, favorites, feedback, and push subscription APIs are provided by a separate backend service.

## Getting started

### Requirements

- Node.js 24
- Yarn 1.x
- A compatible backend API for data-backed features

Install dependencies and start the development server:

```bash
yarn install --frozen-lockfile
yarn dev
```

Open [http://localhost:3900](http://localhost:3900). In development, API requests default to `http://127.0.0.1:9001`.

OAuth login remains unavailable until its public client configuration is provided. The rest of the UI can still be developed without OAuth credentials.

## Commands

| Command | Description |
| --- | --- |
| `yarn dev` | Start the development server on port `3900` |
| `yarn dev:prod` | Start the development server with production-mode public configuration |
| `yarn build` | Create a local production build using development fallbacks |
| `yarn build:prod` | Create a deployable production build; all production variables are required |
| `yarn start` | Start a built application on port `8085` |
| `yarn lint` | Run ESLint |

## Production configuration

Production values are injected at build time through GitHub Actions configuration variables. Add these under **Settings → Secrets and variables → Actions → Variables** in your repository:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_ORIGIN` | Public origin of the backend API |
| `NEXT_PUBLIC_SITE_URL` | Canonical public URL used for metadata, sitemap, sharing, and browser-visible site helpers |
| `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` | Google OAuth public client ID |
| `NEXT_PUBLIC_FUSIONAUTH_AUTHORIZATION_ENDPOINT` | FusionAuth authorization endpoint |
| `NEXT_PUBLIC_FUSIONAUTH_CLIENT_ID` | FusionAuth public client ID |
| `NEXT_PUBLIC_FUSIONAUTH_GOOGLE_IDP_ID` | Google identity-provider ID configured in FusionAuth |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | Parent domain used when clearing authentication cookies |

Values prefixed with `NEXT_PUBLIC_` are compiled into the browser bundle and must never contain secrets.

The deployment workflow also expects these encrypted GitHub Actions secrets:

| Secret | Purpose |
| --- | --- |
| `SSH_PRIVATE_KEY` | Private key used by the deployment runner |
| `SSH_SERVER_IP` | Deployment server address |
| `SSH_USERNAME` | Deployment server user |

## Deployment

The workflow in `.github/workflows/deploy.yml` runs when `main` is updated. It:

1. Installs dependencies and builds the Next.js standalone application.
2. Packages the application in a Docker image.
3. Transfers the image to the configured server over SSH.
4. Replaces the running container and exposes it on port `8085`.

Configure the production reverse proxy to forward traffic to port `8085`. Forks should configure their own Actions variables and secrets before enabling the deployment workflow.

## Project structure

```text
app/          Next.js routes, layouts, metadata, and share-image handlers
components/   Shared UI, application shell, providers, and list components
features/     Feature-level pages and interactions
lib/          API clients, configuration, stores, SEO, TTS, and utilities
messages/     Localized interface dictionaries
public/       Icons, fonts, images, and the service worker
```

## Contributing

1. Fork the repository and create a focused branch.
2. Keep secrets and environment-specific production values out of source control.
3. Run `yarn lint` and `yarn build` before opening a pull request.
4. If you use an AI coding agent, read `AGENTS.md` first; this project relies on the documentation shipped with its installed Next.js version.

## License

FlashMaple is available under the [MIT License](LICENSE).
