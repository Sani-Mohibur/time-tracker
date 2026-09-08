import { ipcMain } from 'electron';
import { SessionService } from '../services/session.service';

export function registerSessionIpc() {
  ipcMain.handle('sessions:getActive', async () => {
    try {
      return await SessionService.getActiveSession();
    } catch (error: any) {
      console.error('[IPC:sessions:getActive] Error:', error);
      throw new Error(error.message || 'Failed to get active session');
    }
  });

  ipcMain.handle('sessions:start', async (_, taskId: number) => {
    try {
      return await SessionService.startSession(taskId);
    } catch (error: any) {
      console.error(`[IPC:sessions:start] Error for taskId ${taskId}:`, error);
      throw new Error(error.message || 'Failed to start session');
    }
  });

  ipcMain.handle('sessions:pause', async () => {
    try {
      return await SessionService.pauseSession();
    } catch (error: any) {
      console.error('[IPC:sessions:pause] Error:', error);
      throw new Error(error.message || 'Failed to pause session');
    }
  });

  ipcMain.handle('sessions:getTodaySummary', async () => {
    try {
      return await SessionService.getTodaySummary();
    } catch (error: any) {
      console.error('[IPC:sessions:getTodaySummary] Error:', error);
      throw new Error(error.message || 'Failed to get today summary');
    }
  });

  ipcMain.handle('sessions:getByDate', async (_, date: string) => {
    try {
      return await SessionService.getDayDetail(date);
    } catch (error: any) {
      console.error(`[IPC:sessions:getByDate] Error for date ${date}:`, error);
      throw new Error(error.message || 'Failed to get sessions by date');
    }
  });

  ipcMain.handle(
    'sessions:getTaskCalendar',
    async (_, taskId: number, year: number, month: number) => {
      try {
        return await SessionService.getTaskCalendar(taskId, year, month);
      } catch (error: any) {
        console.error(`[IPC:sessions:getTaskCalendar] Error for taskId ${taskId}:`, error);
        throw new Error(error.message || 'Failed to get task calendar');
      }
    }
  );

  ipcMain.handle('sessions:getTaskStats', async (_, taskId: number) => {
    try {
      return await SessionService.getTaskStats(taskId);
    } catch (error: any) {
      console.error(`[IPC:sessions:getTaskStats] Error for taskId ${taskId}:`, error);
      throw new Error(error.message || 'Failed to get task stats');
    }
  });

  ipcMain.handle('sessions:getMonthCalendar', async (_, year: number, month: number) => {
    try {
      return await SessionService.getMonthCalendar(year, month);
    } catch (error: any) {
      console.error('[IPC:sessions:getMonthCalendar] Error:', error);
      throw new Error(error.message || 'Failed to get month calendar');
    }
  });

  ipcMain.handle('sessions:getWeeklyStats', async (_, date?: string) => {
    try {
      return await SessionService.getWeeklyStats(date);
    } catch (error: any) {
      console.error('[IPC:sessions:getWeeklyStats] Error:', error);
      throw new Error(error.message || 'Failed to get weekly stats');
    }
  });

  ipcMain.handle('sessions:getMonthlyStats', async (_, year?: number, month?: number) => {
    try {
      return await SessionService.getMonthlyStats(year, month);
    } catch (error: any) {
      console.error('[IPC:sessions:getMonthlyStats] Error:', error);
      throw new Error(error.message || 'Failed to get monthly stats');
    }
  });
}
