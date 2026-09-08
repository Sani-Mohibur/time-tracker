/**
 * Format total seconds into human readable duration string (e.g. "8h 15m", "45m", "0m")
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (h > 0 && m > 0) {
    return `${h}h ${m}m`;
  } else if (h > 0) {
    return `${h}h 00m`;
  } else {
    return `${m}m`;
  }
}

/**
 * Format duration for stopwatch ticker: HH:MM:SS
 */
export function formatTimeTicker(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
}

/**
 * Format timestamp (ms) to time string (e.g. "09:00" or "14:30")
 */
export function formatTimestampTime(timestampMs: number | null): string {
  if (!timestampMs) return '--:--';
  const d = new Date(timestampMs);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format date string YYYY-MM-DD to readable string (e.g. "Wednesday, September 2, 2026")
 */
export function formatDateFull(dateString: string): string {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date string YYYY-MM-DD to short string (e.g. "Sep 2, 2026")
 */
export function formatDateShort(dateString: string): string {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get today's local date string in YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
