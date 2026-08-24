# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This changelog is maintained in English.

## [Unreleased]

### Added

- Added open-source documentation, an MIT license, and a home-page changelog.
- Added production build validation for required API, site, OAuth, and cookie-domain configuration.

### Changed

- Renamed the project, package, application identifiers, runtime events, cache keys, deployment assets, and user-facing brand from Flash Maple to FlashMaple.
- Moved production configuration out of source code and into repository-level GitHub Actions variables and secrets.
- Changed the local development port to `3900` and the production application port to `8085`, with corresponding Docker and deployment updates.

## [5.2.0] - 2026-08-23

### Changed

- Established the existing application as the baseline release for structured changelog maintenance. Detailed changes for this and earlier releases were not previously recorded.
