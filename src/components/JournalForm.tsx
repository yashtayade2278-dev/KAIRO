import { useEffect, useRef, useState } from 'react';
import { Goal, JournalEntry, PlanOutcome, planOptions } from '../types';

export function JournalForm({ goal, onClose, onSave }: {
  goal: Goal;
  onClose: () => void;
  onSave: (entry: JournalEntry) => boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [outcome, setOutcome] = useState<PlanOutcome>();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="journal-title"
    className="m-auto w-[92%] max-w-md rounded-3xl bg-[#fff8ee] p-6 text-slate-800 backdrop:bg-black/40">
    <form className="space-y-5" onSubmit={event => {
      event.preventDefault();
      if (outcome && note.trim() && !onSave({ outcome, note })) setError('Could not save this entry. Check the goal and try again.');
    }}>
      <h2 id="journal-title" className="font-bold text-xl">Check in · {goal.title}</h2>
      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">How much of today’s study plan did you complete?</legend>
        {planOptions.map(option => <label key={option} className="flex gap-3 rounded-xl bg-white p-3">
          <input type="radio" name="outcome" required checked={outcome === option} onChange={() => setOutcome(option)} />
          {option}
        </label>)}
      </fieldset>
      <label className="block font-semibold">What’s worth remembering from today?
        <textarea required rows={3} value={note} onChange={event => setNote(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="flex justify-end gap-4">
        <button type="button" onClick={onClose}>Cancel</button>
        <button disabled={!outcome || !note.trim()} className="kairo-primary-button rounded-xl px-4 py-3 disabled:opacity-50">Save check-in</button>
      </div>
    </form>
  </dialog>;
}
