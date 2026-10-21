# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Fixed 2x double-counting calculation bug in "Today's Tasks" and summary metrics where running session duration was added both from backend query snapshots and live frontend tickers.
- Corrected daily total calculation on Dashboard so completed session durations of currently running tasks are not discarded.

### Added
- Automated verification step in test suite (`scripts/verify-all.ts`) to ensure running sessions are cleanly separated from completed session totals.

---

## [1.0.0] - 2026-10-21

### Added
- Initial release of TimeTracker desktop application.
- Real-time time tracking with start, pause, resume, and switch task capabilities.
- Local SQLite database persistence using Drizzle ORM.
- Dashboard with live active timer, today's summary, and task list.
- Tasks management page with all-time and daily duration stats.
- Calendar view with day-by-day and session-by-session breakdowns.
- Analytics and Statistics page with weekly and monthly trend charts.
- Automated midnight rollover handling and startup cleanup for stale running sessions.
