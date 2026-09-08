import { contextBridge, ipcRenderer } from 'electron';
import { ElectronAPI } from '../shared/types';

const api: ElectronAPI = {
  tasks: {
    getAll: () => ipcRenderer.invoke('tasks:getAll'),
    getById: (id: number) => ipcRenderer.invoke('tasks:getById', id),
    create: (name: string) => ipcRenderer.invoke('tasks:create', name),
    delete: (id: number) => ipcRenderer.invoke('tasks:delete', id),
  },
  sessions: {
    getActive: () => ipcRenderer.invoke('sessions:getActive'),
    start: (taskId: number) => ipcRenderer.invoke('sessions:start', taskId),
    pause: () => ipcRenderer.invoke('sessions:pause'),
    getTodaySummary: () => ipcRenderer.invoke('sessions:getTodaySummary'),
    getByDate: (date: string) => ipcRenderer.invoke('sessions:getByDate', date),
    getTaskCalendar: (taskId: number, year: number, month: number) =>
      ipcRenderer.invoke('sessions:getTaskCalendar', taskId, year, month),
    getTaskStats: (taskId: number) => ipcRenderer.invoke('sessions:getTaskStats', taskId),
    getMonthCalendar: (year: number, month: number) =>
      ipcRenderer.invoke('sessions:getMonthCalendar', year, month),
    getWeeklyStats: (date?: string) => ipcRenderer.invoke('sessions:getWeeklyStats', date),
    getMonthlyStats: (year?: number, month?: number) =>
      ipcRenderer.invoke('sessions:getMonthlyStats', year, month),
  },
};

contextBridge.exposeInMainWorld('api', api);
