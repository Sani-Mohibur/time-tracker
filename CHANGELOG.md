# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-10-26

### Added
- **Dashboard Task Filters**: Added a dropdown selector on the Dashboard page to switch between "Today's Tasks" (displaying only tasks worked on during the current day) and "Recent Tasks" (displaying tasks tracked within the last 7 days, including today) with dedicated empty states.
  - Persistent filter selection saved to `localStorage` across page navigation and application restarts, defaulting to "Today's Tasks" when no previous selection exists.
- **Tasks Page Search**: Added a real-time search input field between the header and task list, allowing users to dynamically filter tasks by name with light/dark mode support and a clear-search empty state.
- **Task Sorting and Organization**:
  - **Manual Drag-and-Drop**: Enabled drag-and-drop task reordering with persistent custom order saved to `localStorage`.
  - **Sorting Presets**: Added instant sorting by *Date Added – Newest First*, *Date Added – Oldest First*, *Most Time Tracked*, *Most Popular* (by usage/session frequency), and *Recently Worked On*.
  - Persistent sort mode preference across sessions.
  - Disabled manual dragging controls when non-manual sorting modes are active.
- **Task Activity Metrics**: Enriched the task data model with `lastTrackedAt`, `sessionCount`, and `recentDuration` calculated in both SQLite backend and browser preview environments.

### Changed
- **Single-Column Task Layout**: Redesigned the Tasks page from a two-column grid to a streamlined, compact single-column row layout, optimizing horizontal desktop space, reducing vertical padding, and keeping all metrics and controls accessible.

---

## [1.0.1] - 2026-10-21

### Fixed
- Fixed 2x double-counting calculation bug in "Today's Tasks" and summary metrics where running session duration was added both from backend query snapshots and live frontend tickers.
- Corrected daily total calculation on Dashboard so completed session durations of currently running tasks are not discarded.
- Fixed task name input field visibility in dark mode within CreateTaskModal by applying dark background, border, and placeholder styling.

### Added
- Automated verification step in test suite (`scripts/verify-all.ts`) to ensure running sessions are cleanly separated from completed session totals.

---

## [1.0.0] - 2026-10-21

### Added
- Initial release of Time Tracker desktop application.
- Real-time time tracking with start, pause, resume, and switch task capabilities.
- Local SQLite database persistence using Drizzle ORM.
- Dashboard with live active timer, today's summary, and task list.
- Tasks management page with all-time and daily duration stats.
- Calendar view with day-by-day and session-by-session breakdowns.
- Analytics and Statistics page with weekly and monthly trend charts.
- Automated midnight rollover handling and startup cleanup for stale running sessions.
