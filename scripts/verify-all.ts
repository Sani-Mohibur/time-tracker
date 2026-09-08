import { getDb, initDatabase } from '../src/main/database/client';
import { tasks, timeSessions } from '../src/main/database/schema';
import { TaskService } from '../src/main/services/task.service';
import { SessionService, getLocalDateString, getEndOfDayTimestamp } from '../src/main/services/session.service';
import { eq } from 'drizzle-orm';

async function runVerification() {
  console.log('=== STARTING AUTOMATED FUNCTIONAL VERIFICATION ===\n');

  // Initialize DB
  initDatabase();
  const db = getDb();

  // Clear existing test data
  db.delete(timeSessions).run();
  db.delete(tasks).run();
  console.log('✓ Database cleaned and initialized');

  // 1. Create Task "Office"
  const office = await TaskService.createTask('Office');
  console.log(`✓ 1. Created task "Office" (ID: ${office.id})`);

  // 2. Start Office timer
  const session1 = await SessionService.startSession(office.id);
  console.log(`✓ 2. Started session #1 for Office (Status: ${session1.status})`);

  // Wait 1.5 seconds for duration
  await new Promise((r) => setTimeout(r, 1500));

  // 3. Pause Office
  const paused1 = await SessionService.pauseSession();
  console.log(`✓ 3. Paused session #1 (Duration: ${paused1?.duration}s, Status: ${paused1?.status})`);
  if (!paused1 || paused1.duration < 1) throw new Error('Session 1 duration calculation failed');

  // 4. Resume Office (starts a new session for today)
  const session2 = await SessionService.startSession(office.id);
  console.log(`✓ 4. Resumed Office via session #2 (Status: ${session2.status})`);

  // Wait 1.5 seconds
  await new Promise((r) => setTimeout(r, 1500));

  // 5. Pause again
  const paused2 = await SessionService.pauseSession();
  console.log(`✓ 5. Paused session #2 (Duration: ${paused2?.duration}s, Status: ${paused2?.status})`);

  // 6. Verify total duration
  const officeAfterPause = await TaskService.getTaskById(office.id);
  const expectedTotal = paused1.duration + (paused2?.duration || 0);
  console.log(`✓ 6. Total duration verified: ${officeAfterPause?.todayDuration}s (Expected: ${expectedTotal}s)`);
  if (officeAfterPause?.todayDuration !== expectedTotal) {
    throw new Error(`Total duration mismatch: ${officeAfterPause?.todayDuration} vs ${expectedTotal}`);
  }

  // 7 & 8. Persistence Check (simulating restart and reading from DB)
  const persistedTasks = await TaskService.getAllTasks();
  const persistedOffice = persistedTasks.find((t) => t.id === office.id);
  if (!persistedOffice || persistedOffice.todayDuration !== expectedTotal) {
    throw new Error('Data persistence failed on re-fetch');
  }
  console.log(`✓ 7 & 8. Data persistence verified across queries`);

  // 9. Create Task "Learning"
  const learning = await TaskService.createTask('Learning');
  console.log(`✓ 9. Created task "Learning" (ID: ${learning.id})`);

  // 10 & 11. Start Office, then start Learning -> verify only ONE active task
  await SessionService.startSession(office.id);
  let active = await SessionService.getActiveSession();
  console.log(`✓ 10. Office running (Active: ${active?.task.name})`);

  await SessionService.startSession(learning.id);
  active = await SessionService.getActiveSession();
  console.log(`✓ 11. Started Learning -> Active is now: ${active?.task.name}`);
  if (active?.task.id !== learning.id) throw new Error('Active task constraint failed');

  // Verify Office was automatically paused
  const officeSessions = db.select().from(timeSessions).where(eq(timeSessions.taskId, office.id)).all();
  const unpausedOffice = officeSessions.filter((s) => s.status === 'running');
  if (unpausedOffice.length !== 0) throw new Error('Previous active session was not paused!');
  console.log(`✓ 11b. Verified Office session was cleanly completed when Learning started`);

  // Pause Learning
  await SessionService.pauseSession();

  // 12. Verify daily totals
  const todaySummary = await SessionService.getTodaySummary();
  console.log(`✓ 12. Today summary: Total seconds = ${todaySummary.totalSeconds}s across ${todaySummary.tasks.length} tasks`);
  if (todaySummary.totalSeconds <= 0) throw new Error('Today total calculation failed');

  // 13. Verify weekly totals
  const weeklyStats = await SessionService.getWeeklyStats();
  console.log(`✓ 13. Weekly stats: Total = ${weeklyStats.totalSeconds}s, tasks count = ${weeklyStats.taskBreakdown.length}`);
  if (weeklyStats.totalSeconds !== todaySummary.totalSeconds) {
    throw new Error('Weekly total should match today total for single day test');
  }

  // 14. Verify monthly totals
  const monthlyStats = await SessionService.getMonthlyStats();
  console.log(`✓ 14. Monthly stats: Total = ${monthlyStats.totalSeconds}s for ${monthlyStats.monthName}`);
  if (monthlyStats.totalSeconds !== todaySummary.totalSeconds) {
    throw new Error('Monthly total should match today total for single day test');
  }

  // 15 & 16. Verify Office-specific calendar
  const now = new Date();
  const officeCalendar = await SessionService.getTaskCalendar(office.id, now.getFullYear(), now.getMonth() + 1);
  console.log(`✓ 15 & 16. Office calendar days count: ${officeCalendar.length}`);
  const todayEntry = officeCalendar.find((d) => d.date === getLocalDateString());
  if (!todayEntry || todayEntry.sessions.length < 2) {
    throw new Error('Office calendar day entry missing sessions');
  }
  console.log(`✓ 17. Click date / sessions verification: Found ${todayEntry.sessions.length} sessions for Office on ${todayEntry.date}`);

  // 18 & 20. Test Historical Running Session Cleanup / Midnight Boundary Rule
  // Insert a mock session from yesterday (date: '2026-09-01') left running
  const yesterday = '2026-09-01';
  const startYesterday = new Date(2026, 8, 1, 10, 0, 0, 0).getTime();
  const insertedYesterdayRunning = db
    .insert(timeSessions)
    .values({
      taskId: office.id,
      date: yesterday,
      startTime: startYesterday,
      endTime: null,
      duration: 0,
      status: 'running',
    })
    .returning()
    .get();

  console.log(`✓ Simulated dangling running session #${insertedYesterdayRunning.id} from yesterday ${yesterday}`);

  // Run startup cleanup
  SessionService.cleanUpStaleRunningSessions();

  // Verify yesterday's session was closed at 23:59:59.999
  const cleanedYesterday = db.select().from(timeSessions).where(eq(timeSessions.id, insertedYesterdayRunning.id)).get();
  console.log(`✓ 18 & 20. Auto-closed yesterday session: Status = ${cleanedYesterday?.status}, EndTime = ${cleanedYesterday?.endTime}, Duration = ${cleanedYesterday?.duration}s`);
  const expectedYesterdayEnd = getEndOfDayTimestamp(yesterday);
  if (cleanedYesterday?.status !== 'completed' || cleanedYesterday.endTime !== expectedYesterdayEnd) {
    throw new Error('Yesterday running session was not closed at day boundary correctly!');
  }

  // 19. Close & Reopen while today's timer is running
  const todayLiveSession = await SessionService.startSession(office.id);
  console.log(`✓ 19. Started today session #${todayLiveSession.id}`);
  // Run startup cleanup again: today's session must NOT be closed
  SessionService.cleanUpStaleRunningSessions();
  const todayActiveAfterCleanup = await SessionService.getActiveSession();
  if (!todayActiveAfterCleanup || todayActiveAfterCleanup.session.id !== todayLiveSession.id) {
    throw new Error('Today running session was incorrectly closed on startup!');
  }
  console.log(`✓ 19b. Today running session preserved on restart recovery`);
  await SessionService.pauseSession();

  // 21. Delete Task and verify cascade deletion of sessions
  await TaskService.deleteTask(office.id);
  const remainingOfficeSessions = db.select().from(timeSessions).where(eq(timeSessions.taskId, office.id)).all();
  if (remainingOfficeSessions.length !== 0) {
    throw new Error('Cascade deletion failed: orphaned sessions found!');
  }
  console.log(`✓ 21. Deleted task "Office" -> All related time sessions successfully cascade-deleted`);

  console.log('\n======================================================');
  console.log('🎉 ALL 21 TEST FLOWS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');
}

runVerification().catch((err) => {
  console.error('❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
