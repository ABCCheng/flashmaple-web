# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This changelog is maintained in English.

## [Unreleased]

### Added

- Added a localized in-page Change Log section to the public home page, rendered directly from `CHANGELOG.md`.
- Added a compact release timeline that keeps the latest three releases visible and groups older releases in a bounded, scrollable archive.
- Added a link to the source repository in the public home-page footer.
- Added the MIT license and documented it in the project README.
- Added production build validation for required API, site, OAuth, and cookie-domain configuration.
- Added open-source project documentation covering setup, architecture, configuration, deployment, and contribution guidelines.

### Changed

- Renamed the project, package, application identifiers, runtime events, cache keys, deployment assets, and user-facing brand from Flash Maple to FlashMaple.
- Moved production API, site, OAuth, and cookie-domain values from source code to GitHub Actions configuration variables.
- Updated service-worker notification links to use the active site origin.
- Updated the deployment workflow and Docker configuration for the renamed application and new production port.
- Updated the home-page changelog to omit the document preamble and begin with the first release.

### Removed

- Removed hard-coded production API, site, OAuth, and identity-provider values from the web client.
- Removed private network development origins from the Next.js configuration.
- Removed the hard-coded production hostname from self-referencing application links.

## [5.2.0] - 2026-08-23

### Changed

- Established the existing application as the baseline release for structured changelog maintenance. Detailed changes for this and earlier releases were not previously recorded.
