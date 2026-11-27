/**
 * Storage and Persistence Layer for Kairo
 * Uses localStorage with custom event dispatching for instant multi-component reactivity.
 */

import {
  Goal,
  HomeWidget,
  applyCheckIn,
  calculateActiveStreak,
  JournalEntry,
} from '../types.ts';

const GOALS_STORAGE_KEY = 'streakdown_goals_v1';
const WIDGETS_STORAGE_KEY = 'streakdown_widgets_v1';
export const STORAGE_CHANGE_EVENT = 'streakdown_data_updated';

function notifyDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT));
  }
}

export function loadGoals(simulatedDate: Date = new Date()): Goal[] {
  try {
    const raw = localStorage.getItem(GOALS_STORAGE_KEY);
    if (!raw) return [];
    const stored: Goal[] = JSON.parse(raw);
    // Remove only the two demonstration goals from older app versions.
    // Keep any goals the user created themselves.
    const goals = stored.filter((g) => g.id !== 'goal-seed-1' && g.id !== 'goal-seed-2');

    return goals.map((g) => ({
      ...g,
      currentStreak: calculateActiveStreak(Object.keys(g.journal ?? {}), simulatedDate),
    }));
  } catch {
    return [];
  }
}

function syncGoalsToNative(goals: Goal[]): void {
  try {
    const nativePlugin = (window as any)?.Capacitor?.Plugins?.StreakDownNative;
    if (nativePlugin?.syncGoals) void nativePlugin.syncGoals({ goals });
  } catch (err) {
    // Browser preview has no native widget bridge; local storage remains authoritative there.
  }
}

export function saveGoals(goals: Goal[], notify = true): boolean {
  try {
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
    syncGoalsToNative(goals);
    if (notify) notifyDataChanged();
    return true;
  } catch (err) {
    console.error('Failed to save goals to localStorage:', err);
    return false;
  }
}

export function loadWidgets(): HomeWidget[] {
  try {
    const raw = localStorage.getItem(WIDGETS_STORAGE_KEY);
    if (!raw) {
      saveWidgets([], false);
      return [];
    }
    const widgets: HomeWidget[] = JSON.parse(raw);
    const goals = loadGoals();
    const validGoalIds = new Set(goals.map((g) => g.id));
    const validWidgets = widgets.filter((w) => validGoalIds.has(w.goalId));
    if (validWidgets.length !== widgets.length) saveWidgets(validWidgets, false);
    return validWidgets;
  } catch {
    return [];
  }
}

export function saveWidgets(widgets: HomeWidget[], notify = true): void {
  try {
    localStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(widgets));
    if (notify) notifyDataChanged();
  } catch (err) {
    console.error('Failed to save widgets to localStorage:', err);
  }
}

export function createGoal(
  data: { title: string; description?: string; targetDate: string },
  currentDate: Date = new Date()
): Goal {
  const goals = loadGoals(currentDate);

  const newGoal: Goal = {
    id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: data.title.trim(),
    description: data.description?.trim() || undefined,
    targetDate: data.targetDate,
    createdAt: new Date().toISOString(),
    checkIns: [],
    journal: {},
    currentStreak: 0,
  };

  const updatedGoals = [newGoal, ...goals];
  saveGoals(updatedGoals);
  return newGoal;
}

export function updateGoal(
  id: string,
  updates: Partial<Omit<Goal, 'id' | 'createdAt'>>,
  currentDate: Date = new Date()
): Goal | null {
  const goals = loadGoals(currentDate);
  const idx = goals.findIndex((g) => g.id === id);
  if (idx === -1) return null;

  const current = goals[idx];
  const updated: Goal = {
    ...current,
    ...updates,
    title: updates.title !== undefined ? updates.title.trim() : current.title,
    description:
      updates.description !== undefined
        ? updates.description.trim() || undefined
        : current.description,
  };

  goals[idx] = updated;
  saveGoals(goals);
  return updated;
}

export function deleteGoal(id: string, currentDate: Date = new Date()): void {
  const goals = loadGoals(currentDate);
  const updatedGoals = goals.filter((g) => g.id !== id);
  saveGoals(updatedGoals);

  // Also remove any widgets associated with this deleted goal
  const widgets = loadWidgets();
  const updatedWidgets = widgets.filter((w) => w.goalId !== id);
  saveWidgets(updatedWidgets);
}

export function checkInGoal(id: string, entry: JournalEntry, currentDate: Date = new Date()): Goal | null {
  const goals = loadGoals(currentDate);
  const goal = goals.find((g) => g.id === id);
  if (!goal) return null;

  const updated = applyCheckIn(goal, entry, currentDate);
  if (!updated) {
    return null; // Already checked in today
  }

  const updatedGoals = goals.map((g) => (g.id === id ? updated : g));
  return saveGoals(updatedGoals) ? updated : null;
}

export function pinWidget(goalId: string): HomeWidget {
  const widgets = loadWidgets();
  // Allow multiple widgets, but if this exact goal is already pinned, still allow or reuse
  const newWidget: HomeWidget = {
    id: `widget-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    goalId,
    addedAt: new Date().toISOString(),
  };

  const updated = [...widgets, newWidget];
  saveWidgets(updated);
  return newWidget;
}

export function unpinWidget(widgetId: string): void {
  const widgets = loadWidgets();
  const updated = widgets.filter((w) => w.id !== widgetId);
  saveWidgets(updated);
}
