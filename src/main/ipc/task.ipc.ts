import { ipcMain } from 'electron';
import { TaskService } from '../services/task.service';

export function registerTaskIpc() {
  ipcMain.handle('tasks:getAll', async () => {
    try {
      return await TaskService.getAllTasks();
    } catch (error: any) {
      console.error('[IPC:tasks:getAll] Error:', error);
      throw new Error(error.message || 'Failed to fetch tasks');
    }
  });

  ipcMain.handle('tasks:getById', async (_, id: number) => {
    try {
      return await TaskService.getTaskById(id);
    } catch (error: any) {
      console.error(`[IPC:tasks:getById] Error for id ${id}:`, error);
      throw new Error(error.message || 'Failed to fetch task');
    }
  });

  ipcMain.handle('tasks:create', async (_, name: string) => {
    try {
      return await TaskService.createTask(name);
    } catch (error: any) {
      console.error('[IPC:tasks:create] Error:', error);
      throw new Error(error.message || 'Failed to create task');
    }
  });

  ipcMain.handle('tasks:delete', async (_, id: number) => {
    try {
      return await TaskService.deleteTask(id);
    } catch (error: any) {
      console.error(`[IPC:tasks:delete] Error for id ${id}:`, error);
      throw new Error(error.message || 'Failed to delete task');
    }
  });
}
