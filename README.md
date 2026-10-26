# Time Tracker Desktop Application

A minimal, fast, and offline desktop time-tracking application built with **Electron**, **React**, **TypeScript**, **Vite**, **Tailwind CSS**, **SQLite** (`better-sqlite3`), and **Drizzle ORM**.

---

## 🎯 Features

- **Task & Category Management**: Create, search, sort, and delete tasks (such as *Office*, *Learning*, *Personal Project*, *Freelancing*).
- **Single-Column Task Layout**: Streamlined, compact single-column list with one task per row, optimizing horizontal desktop space, reducing vertical footprint, and keeping duration metrics and controls immediately accessible.
- **Dynamic Task Search**: Real-time name search input that filters tasks dynamically as you type, complete with an instant clear button and dedicated empty state.
- **Flexible Task Organization & Sorting**:
  - **Manual Drag-and-Drop**: Reorder tasks intuitively with custom order persisted in `localStorage`.
  - **Sorting Presets**: Instant sorting by *Date Added – Newest First*, *Date Added – Oldest First*, *Most Time Tracked*, *Most Popular* (by usage/session frequency), and *Recently Worked On*.
  - Drag-and-drop handles activate exclusively in Manual mode, preserving stability across other sort modes.
  - Seamlessly combined with search to preserve active filters and sorting simultaneously.
- **Daily Dashboard with Activity Filters**: Real-time ticker for active task, today's total tracked time, quick controls, and a persistent dropdown selector to toggle between **Today's Tasks** (displaying only tasks worked on today) and **Recent Tasks** (tasks worked on within the last 7 days), with preference preserved across page navigation and app restarts.
- **Accurate Live Timer**: Drift-free timestamp-based tracking (`Date.now() - startTime`), keeping live accuracy even if UI re-renders or the app is minimized.
- **Strict Daily Boundary Enforcement**:
  - Task sessions belong strictly to a local calendar date (`YYYY-MM-DD`).
  - Sessions cannot span across dates.
  - If a timer was running when the app or computer was closed on a previous day, on startup the session is automatically closed at `23:59:59.999` of that day.
  - Real-time midnight rollover smoothly closes the previous day's session and begins a new session for the new date.
- **Single Active Task Constraint**: Prevents running multiple tasks simultaneously, offering a clean confirmation prompt before switching.
- **Overall Calendar**: Interactive monthly calendar showing total tracked time across all tasks for each day. Click any date to view all tasks and sessions for that day.
- **Task Details & Dedicated Calendar**:
  - Stat cards: **Today**, **This Week**, **This Month**, and **All Time**.
  - Task-specific monthly calendar displaying only that task's sessions.
  - Interactive session log with start times, end times, and durations.
- **Weekly & Monthly Analytics**: Visual breakdown of time spent per task and day-by-day activity charts.
- **100% Offline & Local**: No external APIs, no cloud sync, no tracking, and no accounts required. All data stays on your machine in local SQLite.

---

## 🛠️ Tech Stack

- **Desktop Framework**: [Electron](https://www.electronjs.org/) (Main process + Preload with Context Isolation)
- **Frontend**: [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)
- **Database & ORM**: Local SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) and [Drizzle ORM](https://orm.drizzle.team/)
- **Packager**: [electron-builder](https://www.electron.build/)

---

## 📂 Project Architecture

```
tracker-app/
├── src/
│   ├── main/                       # Electron Main Process (Node.js runtime)
│   │   ├── index.ts                # App lifecycle, single instance lock, window creation
│   │   ├── preload.ts              # Secure contextBridge exposing window.api
│   │   ├── database/
│   │   │   ├── schema.ts           # Drizzle SQLite schema (tasks & time_sessions)
│   │   │   └── client.ts           # SQLite client with WAL mode & auto table creation
│   │   ├── services/
│   │   │   ├── task.service.ts     # Task CRUD and duration aggregations
│   │   │   └── session.service.ts  # Timer logic, rollover, and calendar analytics
│   │   └── ipc/
│   │       ├── task.ipc.ts         # Task IPC handlers
│   │       └── session.ipc.ts      # Session & Stats IPC handlers
│   │
│   ├── shared/
│   │   └── types/
│   │       └── index.ts            # Type contracts shared between Main, Preload & Renderer
│   │
│   └── renderer/                   # React Frontend (Browser runtime)
│       ├── main.tsx                # React DOM root entry
│       ├── App.tsx                 # Main application shell with tab navigation
│       ├── index.css               # Tailwind CSS rules & typography
│       ├── components/
│       │   ├── Navbar.tsx          # Top navigation bar with active timer widget
│       │   ├── CalendarGrid.tsx    # Reusable monthly calendar grid component
│       │   ├── CreateTaskModal.tsx # Task creation modal
│       │   └── ConfirmModal.tsx    # Accessible confirmation modal
│       ├── pages/
│       │   ├── DashboardPage.tsx   # Today's overview, live ticker, and Today's/Recent task filters
│       │   ├── TasksPage.tsx       # Single-column task list with search, sorting, and drag-and-drop
│       │   ├── TaskDetailsPage.tsx # Individual task stats, calendar, and session log
│       │   ├── CalendarPage.tsx    # Overall calendar view with date breakdown
│       │   └── StatisticsPage.tsx  # Weekly & monthly analytics
│       ├── hooks/
│       │   └── useTracker.ts       # React hook for data fetching & live stopwatch ticking
│       └── utils/
│           ├── time.ts             # Duration, timestamp and time ticker formatting
│           └── date.ts             # Local date calculations & calendar matrices
│
├── scripts/
│   └── verify-all.ts               # Complete automated test suite covering all 21 user flows
├── vite.config.ts                  # Vite + Electron build configuration
└── package.json
```

---

## 💾 Where Local Data is Stored

The SQLite database (`tracker.db`) is automatically initialized and persisted in your operating system's standard user application data directory:

- **Windows**: `%APPDATA%\tracker-app\tracker.db`  
  *(e.g., `C:\Users\<username>\AppData\Roaming\tracker-app\tracker.db`)*
- **macOS**: `~/Library/Application Support/tracker-app/tracker.db`
- **Linux**: `~/.config/tracker-app/tracker.db`

*Note: In development / standalone test mode, data can also be stored in `./.data/tracker.db`.*

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Version 20 LTS or 22 LTS recommended)
- `npm` (bundled with Node.js)

### 1. Install Dependencies

```bash
npm install
```

### 2. Run in Development Mode

Starts Vite dev server and launches Electron with hot-reload enabled:

```bash
npm run dev
```

### 3. Run Automated Tests & Verifications

Executes the end-to-end integration test suite verifying all 21 test flows (timer accuracy, persistence, daily boundary recovery, midnight rollover, cascading deletion, etc.):

```bash
npm test
```

### 4. Build & Package Desktop Application

Compile TypeScript, bundle assets with Vite, and create Windows installer/portable executable:

```bash
npm run package
```

The compiled binaries will be output to the `./release` directory.

---

## 🔒 Security Best Practices

- `contextIsolation: true` is strictly enforced.
- `nodeIntegration: false` is enabled in the renderer.
- Raw Node APIs are never directly accessible from the React UI.
- All communications pass through typed IPC methods declared in `src/shared/types/index.ts` and exposed securely via `src/main/preload.ts`.

---

## 📄 License

MIT License.
