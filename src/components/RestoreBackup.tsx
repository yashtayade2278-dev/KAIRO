import { useState } from 'react';
import { Goal, planOptions } from '../types';
import { loadGoals, saveGoals } from '../utils/storage';

const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const day = (v: unknown) => text(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v));
const timestamp = (v: unknown) => text(v) && Number.isFinite(Date.parse(v));

function validGoal(g: unknown): g is Goal {
  if (!object(g) || !text(g.id) || !text(g.title) || !day(g.targetDate) || !timestamp(g.createdAt) ||
      !Array.isArray(g.checkIns) || !g.checkIns.every(day) ||
      (g.description !== undefined && typeof g.description !== 'string')) return false;
  if (g.journal !== undefined && (!object(g.journal) || !Object.entries(g.journal).every(([key, entry]) =>
    day(key) && object(entry) && planOptions.some(option => option === entry.outcome) && text(entry.note)))) return false;
  return g.subjects === undefined || (Array.isArray(g.subjects) && g.subjects.every(s =>
    object(s) && text(s.id) && text(s.name) && Array.isArray(s.chapters) && s.chapters.every(c =>
      object(c) && text(c.id) && text(c.name) && (c.coveredAt === undefined || timestamp(c.coveredAt)) &&
      Array.isArray(c.revisions) && c.revisions.every(timestamp))));
}

export function RestoreBackup() {
  const [message, setMessage] = useState('');
  async function restore(file: File) {
    try {
      const xml = new DOMParser().parseFromString(await file.text(), 'application/xml');
      const content = xml.querySelector('map > string[name="goals_json"]')?.textContent;
      if (!content || xml.querySelector('parsererror')) throw new Error('Choose the Kairo recovery XML from Downloads.');
      const records: unknown = JSON.parse(content);
      if (!Array.isArray(records) || !records.every(validGoal)) throw new Error('This backup contains an unreadable goal.');
      const current = loadGoals();
      const seen = new Set(current.map(goal => goal.id));
      const added = records.filter(goal => {
        if (seen.has(goal.id) || ['goal-seed-1', 'goal-seed-2'].includes(goal.id)) return false;
        seen.add(goal.id);
        return true;
      });
      if (!added.length) { setMessage('No new goals in this backup.'); return; }
      if (!saveGoals([...current, ...added])) throw new Error('Could not save the restored goals.');
      setMessage(`Restored ${added.length} ${added.length === 1 ? 'goal' : 'goals'}.`);
    } catch (error) {
      setMessage(error instanceof SyntaxError ? 'The backup contains invalid goal data.' :
        error instanceof Error ? error.message : 'Could not read this backup.');
    }
  }
  return <div className="px-4 py-3">
    <label className="cursor-pointer text-sm font-semibold underline">Restore backup
      <input aria-label="Restore backup" className="sr-only" type="file" onChange={e => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) void restore(file);
      }} />
    </label>
    <p role="status" className="text-sm">{message}</p>
  </div>;
}
