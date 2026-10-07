import { useState } from 'react';
import { useTracker } from './hooks/useTracker';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { TaskDetailsPage } from './pages/TaskDetailsPage';
import { CalendarPage } from './pages/CalendarPage';
import { StatisticsPage } from './pages/StatisticsPage';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [dismissNotice, setDismissNotice] = useState(false);

  const isBrowserPreview = typeof navigator !== 'undefined' && !navigator.userAgent.includes('Electron');

  const {
    tasks,
    activeSession,
    todaySummary,
    liveElapsed,
    startTask,
    pauseTask,
    createTask,
    deleteTask,
  } = useTracker();

  const handleOpenTaskDetails = (taskId: number) => {
    setSelectedTaskId(taskId);
  };

  const handleBackFromTaskDetails = () => {
    setSelectedTaskId(null);
  };

  const handleSelectTab = (tab: NavTab) => {
    setSelectedTaskId(null);
    setCurrentTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-200">
      {/* Browser Preview Notice */}
      {isBrowserPreview && !dismissNotice && (
        <div className="bg-amber-500 text-white text-xs font-medium px-4 py-1.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2 mx-auto">
            <span>🌐 <strong>Browser Preview Mode:</strong> Running in web browser with local storage. Launch the Electron app for SQLite desktop persistence.</span>
          </div>
          <button
            onClick={() => setDismissNotice(true)}
            className="text-amber-100 hover:text-white text-sm font-bold ml-2 px-1 rounded transition-colors"
            title="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        activeSession={activeSession}
        liveElapsed={liveElapsed}
        onPause={pauseTask}
        onOpenTaskDetails={handleOpenTaskDetails}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedTaskId !== null ? (
          <TaskDetailsPage
            taskId={selectedTaskId}
            activeSession={activeSession}
            liveElapsed={liveElapsed}
            onBack={handleBackFromTaskDetails}
            onStartTask={startTask}
            onPauseTask={pauseTask}
            onDeleteTask={deleteTask}
          />
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardPage
                tasks={tasks}
                activeSession={activeSession}
                todaySummary={todaySummary}
                liveElapsed={liveElapsed}
                onStartTask={startTask}
                onPauseTask={pauseTask}
                onCreateTask={createTask}
                onOpenTaskDetails={handleOpenTaskDetails}
                onNavigateToTasks={() => setCurrentTab('tasks')}
              />
            )}

            {currentTab === 'tasks' && (
              <TasksPage
                tasks={tasks}
                activeSession={activeSession}
                liveElapsed={liveElapsed}
                onStartTask={startTask}
                onPauseTask={pauseTask}
                onCreateTask={createTask}
                onDeleteTask={deleteTask}
                onOpenTaskDetails={handleOpenTaskDetails}
              />
            )}

            {currentTab === 'calendar' && (
              <CalendarPage
                activeSession={activeSession}
                liveElapsed={liveElapsed}
                onOpenTaskDetails={handleOpenTaskDetails}
              />
            )}

            {currentTab === 'statistics' && (
              <StatisticsPage
                activeSession={activeSession}
                liveElapsed={liveElapsed}
                onOpenTaskDetails={handleOpenTaskDetails}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
export default App;
