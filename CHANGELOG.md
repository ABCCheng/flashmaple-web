# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This changelog is maintained in English.

## [6.1.1] - 2026-09-04

### Fixed

- Prevented mobile/PWA Google OAuth callback replays by clearing one-shot callback parameters before token exchange and synchronizing the Next.js route state.
- Fixed PWA back navigation after opening multiple news notifications.

## [6.1.0] - 2026-08-30

### Changed

- Allowed multiple home-page changelog releases to remain expanded at the same time.
- Aligned native pull-to-refresh elasticity across mobile Web and PWA by using the app scroll container on both surfaces.

### Fixed

- Cleared consumed Google OAuth callback parameters after a successful sign-in so reopening the sign-in page after logging out no longer retries stale credentials.
- Fixed nested scrolling in Earlier releases so mouse-wheel scrolling remains responsive and continues onto the page at the list boundaries.
- Fixed mobile browser status and safe-area colors not updating immediately when changing the theme from Settings.
- Fixed the notification center and unread badge not synchronizing newly received push messages until the PWA was restarted.
- Restored native scroll-container elasticity on short notification center, news detail, settings, and about pages.

## [6.0.0] - 2026-08-24

### Added

- Added open-source documentation, an MIT license, and a home-page changelog.
- Added production build validation for required API, site, OAuth, and cookie-domain configuration.

### Changed

- Renamed the project, package, application identifiers, runtime events, cache keys, deployment assets, and user-facing brand from Flash Maple to FlashMaple.
- Moved production configuration out of source code and into repository-level GitHub Actions variables and secrets.

## [5.0.0] - 2026-08-20

### Changed

- Established the existing application as the baseline release for structured changelog maintenance. Detailed changes for this and earlier releases were not previously recorded.
