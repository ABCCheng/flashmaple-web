# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This changelog is maintained in English.

## [6.2.1] - 2026-10-21

### Changed

- Match Profile and the web splash screen to the iOS status-bar color with a 32px background fade, without moving cards or changing splash timing and logo placement.

- Blend the bottom 32px of iOS standalone headers into the body background without changing header geometry, content spacing, or the status-bar color sampling layer.

## [6.2.0] - 2026-10-21

### Fixed

- Remove duplicate mobile content padding after measured headers and keep an 8px header-to-content gap on Flash, Explore, and Favorites.

- Measure mobile header heights for Flash, Explore, and Favorites so content and error messages stay below the header as notices, fonts, tabs, and safe areas change.

- Suppress iOS standalone header blur using a fixed color sampling element without status-bar-style metadata; remove the extra blur-avoidance gap and portrait fallback padding.
- Keep status-bar and mobile-header colors coordinated with light, dark, and mood themes; refresh app-shell caches.

## [6.1.3] - 2026-09-16

### Changed

- Improved header spacing and background continuity in iOS PWAs.

### Fixed

- Fixed a startup crash in browsers without `crypto.randomUUID`.

## [6.1.2] - 2026-09-06

### Changed

- Optimized the UI on the Settings pages.

### Fixed

- Fixed incorrect page redirect upon opening the first news notification.

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
