import { useState } from 'react';
import { Chapter, Goal, Subject } from '../types';
import { loadGoals, saveGoals } from '../utils/storage';

const field = 'w-full rounded-lg border border-stone-300 bg-white p-2';
const action = 'rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold';
const dateLabel = (stamp: string) => new Date(stamp).toLocaleDateString(undefined, {
  day: 'numeric', month: 'short', year: 'numeric',
});

export function StudyTracker({ goal, readOnly }: { goal: Goal; readOnly: boolean }) {
  const subjects = goal.subjects ?? [];
  const [filter, setFilter] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [chapterNames, setChapterNames] = useState('');
  const [destination, setDestination] = useState('');
  const [message, setMessage] = useState('');

  function change(edit: (current: Subject[]) => Subject[]) {
    const goals = loadGoals();
    const current = goals.find(item => item.id === goal.id);
    if (!current || readOnly) return false;
    try {
      current.subjects = edit(current.subjects ?? []);
      if (!saveGoals(goals)) throw new Error('Could not save. Please try again.');
      setMessage('');
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save.');
      return false;
    }
  }

  function addChapters() {
    const names = chapterNames.split('\n').map(line => line.trim()).filter(Boolean);
    if (!names.length) return;
    const saved = change(current => {
      const existing = current.find(item => item.id === destination);
      if (!existing && (!subjectName.trim() || current.length >= 5))
        throw new Error('Choose an existing subject or add up to five subjects.');
      if (!existing && current.some(item => item.name.toLowerCase() === subjectName.trim().toLowerCase()))
        throw new Error('Choose the existing subject to add chapters to it.');
      const unique = new Set(existing?.chapters.map(chapter => chapter.name.toLowerCase()));
      const chapters: Chapter[] = [];
      for (const name of names) {
        if (unique.has(name.toLowerCase())) continue;
        unique.add(name.toLowerCase());
        chapters.push({ id: crypto.randomUUID(), name, revisions: [] });
      }
      if (!chapters.length) throw new Error('These chapters are already in this subject.');
      if (existing) return current.map(item => item.id === existing.id
        ? { ...item, chapters: [...item.chapters, ...chapters] } : item);
      return [...current, { id: crypto.randomUUID(), name: subjectName.trim(), chapters }];
    });
    if (saved) {
      setSubjectName('');
      setChapterNames('');
      setMessage('Chapters saved.');
    }
  }

  function record(subjectId: string, selected: Chapter) {
    const stamp = new Date().toISOString();
    change(current => current.map(subject => subject.id !== subjectId ? subject : {
      ...subject, chapters: subject.chapters.map(chapter => {
        if (chapter.id !== selected.id || chapter.coveredAt !== selected.coveredAt ||
            chapter.revisions.length !== selected.revisions.length) return chapter;
        return chapter.coveredAt ? { ...chapter, revisions: [...chapter.revisions, stamp] }
          : { ...chapter, coveredAt: stamp };
      }),
    }));
  }

  const rows = subjects.filter(subject => !filter || subject.id === filter)
    .flatMap(subject => subject.chapters.map(chapter => ({ subject, chapter })));
  const lastStudy = (chapter: Chapter) => chapter.revisions.at(-1) ?? chapter.coveredAt ?? '';
  const groups = [
    { title: 'To cover', rows: rows.filter(({ chapter }) => !chapter.coveredAt) },
    { title: 'Awaiting first revision', rows: rows.filter(({ chapter }) => chapter.coveredAt && !chapter.revisions.length) },
    { title: 'Previously revised', rows: rows.filter(({ chapter }) => chapter.revisions.length) },
  ];

  return <details className="border-t border-black/10 pt-3">
    <summary className="cursor-pointer font-semibold">Subjects and revision</summary>
    <div className="space-y-4 pt-3">
      {!readOnly && <details open={subjects.length === 0 || undefined}>
        <summary className="cursor-pointer text-sm font-medium">Set up subjects and chapters</summary>
        <form className="space-y-3 pt-2" onSubmit={event => { event.preventDefault(); addChapters(); }}>
          <label className="block">Subject
            <select className={field} value={destination} onChange={event => setDestination(event.target.value)}>
              <option value="" disabled={subjects.length >= 5}>{subjects.length >= 5 ? 'Choose a subject' : 'New subject'}</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          {!destination && subjects.length < 5 && <label className="block">Subject name
            <input className={field} required value={subjectName} onChange={event => setSubjectName(event.target.value)} />
          </label>}
          <label className="block">Chapter names (one per line)
            <textarea className={field} required value={chapterNames} onChange={event => setChapterNames(event.target.value)} />
          </label>
          <button className={action} disabled={!chapterNames.trim() || (!destination && (!subjectName.trim() || subjects.length >= 5))}>Save chapters</button>
        </form>
      </details>}
      {message && <p role="status">{message}</p>}
      {subjects.length > 0 && <>
        <table className="w-full text-sm text-left"><thead><tr><th>Subject</th><th>To cover</th><th>Awaiting first revision</th></tr></thead>
          <tbody>{subjects.map(subject => <tr key={subject.id}><td>{subject.name}</td>
            <td>{subject.chapters.filter(ch => !ch.coveredAt).length}</td>
            <td>{subject.chapters.filter(ch => ch.coveredAt && !ch.revisions.length).length}</td></tr>)}</tbody>
        </table>
        <label className="block">View chapters
          <select className={field} value={filter} onChange={event => setFilter(event.target.value)}>
            <option value="">All subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        {groups.map(group => <section key={group.title}><h4 className="font-semibold">{group.title}</h4>
          {!group.rows.length && <p className="text-sm text-slate-500">No chapters</p>}
          {group.rows.sort((a,b) => lastStudy(a.chapter).localeCompare(lastStudy(b.chapter))).map(({ subject, chapter }) =>
            <div key={chapter.id} className="flex items-center justify-between gap-2 py-2 border-b border-black/10">
              <div className="min-w-0 break-words"><p>{chapter.name}</p><p className="text-xs text-slate-600">{subject.name}
                {chapter.coveredAt && ' · Covered ' + dateLabel(chapter.coveredAt)}
                {chapter.revisions.length > 0 && ' · ' + chapter.revisions.length + (chapter.revisions.length === 1 ? ' revision' : ' revisions') + ' · Last revised ' + dateLabel(lastStudy(chapter))}
              </p></div>
              {!readOnly && <button className={action} onClick={() => record(subject.id, chapter)}>
                {chapter.coveredAt ? 'Log a revision' : 'Mark covered'}</button>}
            </div>)}
        </section>)}
      </>}
    </div>
  </details>;
}
