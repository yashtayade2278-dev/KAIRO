/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { JournalForm } from './components/JournalForm';
import { Goal, hasCheckedInOnDate, isGoalCompleted } from './types.ts';
import { loadGoals, createGoal, updateGoal, deleteGoal, checkInGoal, STORAGE_CHANGE_EVENT, saveGoals } from './utils/storage.ts';
import { AndroidFrame } from './components/AndroidFrame.tsx';
import { MainScreen } from './components/MainScreen.tsx';

export default function App() {
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals(new Date()));
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  const [journalId, setJournalId] = useState<string | null>(null);
  const journalGoal = goals.find(goal => goal.id === journalId);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate((p) => (new Date().toDateString() === p.toDateString() ? p : new Date())), 60000);
    return () => clearInterval(timer);
  }, []);

  const refreshData = useCallback(() => setGoals(loadGoals(new Date())), []);

  useEffect(() => {
    const plugin = (window as any)?.Capacitor?.Plugins?.StreakDownNative;
    const listener = plugin?.addListener('openJournal', ({ goalId }: { goalId: string }) => setJournalId(goalId));
    // Widgets only read the native mirror now. Import older widget check-ins once.
    let active = true;
    async function migrate() {
      if (!plugin || localStorage.getItem('kairo_journal_migrated')) return;
      const { goals: nativeGoals } = await plugin.getGoals();
      if (!active) return;
      const merged = new Map(loadGoals().map(goal => [goal.id, goal]));
      for (const goal of nativeGoals as Goal[]) {
        if (goal.id === 'goal-seed-1' || goal.id === 'goal-seed-2') continue;
        const local = merged.get(goal.id);
        merged.set(goal.id, { ...goal, ...local,
          checkIns: [...new Set([...goal.checkIns, ...(local?.checkIns ?? [])])],
          journal: { ...goal.journal, ...local?.journal },
        });
      }
      if (saveGoals([...merged.values()])) localStorage.setItem('kairo_journal_migrated', '1');
    }
    void migrate().catch(console.error);
    const handleVisibility = () => { if (document.visibilityState === 'visible') setCurrentDate(new Date()); };
    const handleStorageChange = () => refreshData();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    return () => {
      active = false;
      void listener?.then((handle: { remove: () => void }) => handle.remove());
      window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshData]);

  const handleAddGoal = (data: { title: string; description?: string; targetDate: string }) => { createGoal(data, new Date()); refreshData(); };
  const handleEditGoal = (id: string, updates: Partial<Goal>) => { updateGoal(id, updates, new Date()); refreshData(); };
  const handleDeleteGoal = (id: string) => { deleteGoal(id, new Date()); refreshData(); };

  return (
    <AndroidFrame>
      <MainScreen goals={goals} simulatedDate={currentDate} onCheckIn={setJournalId} onAddGoal={handleAddGoal} onEditGoal={handleEditGoal} onDeleteGoal={handleDeleteGoal} />
      {journalGoal && !hasCheckedInOnDate(journalGoal, currentDate) && !isGoalCompleted(journalGoal, currentDate) &&
        <JournalForm key={journalGoal.id} goal={journalGoal} onClose={() => setJournalId(null)} onSave={entry => {
          if (!checkInGoal(journalGoal.id, entry)) return false;
          setJournalId(null);
          return true;
        }} />}
    </AndroidFrame>
  );
}
