'use client';
import { useState } from 'react';
import { Trash2, LoaderCircle, Bell } from 'lucide-react';
import { categories, type Reminder, type ReminderInput } from '@/lib/reminders';
import { format } from 'date-fns';

export function ReminderForm({ reminder, onSave, onDelete, defaultCategory = 'Birthday', defaultAlerts = '30,7,0' }: { reminder?: Reminder; onSave: (input: ReminderInput) => Promise<void>; onDelete: () => Promise<void>; defaultCategory?: ReminderInput['category']; defaultAlerts?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recurrence, setRecurrence] = useState(reminder?.recurrence || 'Once');
  const [alerts, setAlerts] = useState((reminder?.alerts || defaultAlerts).split(','));
  return <form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); const data = new FormData(e.currentTarget); try { await onSave({ title: String(data.get('title')), category: data.get('category') as ReminderInput['category'], date: String(data.get('date')), recurrence: recurrence as ReminderInput['recurrence'], intervalDays: recurrence === 'Custom' ? Number(data.get('intervalDays')) : null, notes: String(data.get('notes')), reference: String(data.get('reference')), alerts: alerts.join(',') }); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); } finally { setBusy(false); } }} className="reminder-form">
    <label>Reminder title<input name="title" placeholder="e.g. Emma’s birthday" required maxLength={200} defaultValue={reminder?.title} autoFocus /></label>
    <div className="form-grid"><label>Category<select name="category" defaultValue={reminder?.category || defaultCategory}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>Target date<input type="date" name="date" required defaultValue={reminder?.date.slice(0, 10) || format(new Date(), 'yyyy-MM-dd')} /></label></div>
    <div className="form-grid"><label>Recurrence<select value={recurrence} onChange={e => setRecurrence(e.target.value as ReminderInput['recurrence'])}><option>Once</option><option>Yearly</option><option>Custom</option></select></label>{recurrence === 'Custom' ? <label>Repeat every (days)<input name="intervalDays" type="number" min={1} max={3650} required defaultValue={reminder?.intervalDays || 180} /></label> : <label>Reference number <span className="optional">optional</span><input name="reference" defaultValue={reminder?.reference} placeholder="Policy or document number" /></label>}</div>
    {recurrence === 'Custom' && <label>Reference number<input name="reference" defaultValue={reminder?.reference} placeholder="Optional reference" /></label>}
    <fieldset><legend><Bell size={15} /> Remind me before</legend><div className="alert-options">{[['180', '6 months'], ['90', '3 months'], ['30', '1 month'], ['7', '1 week'], ['0', 'On the day']].map(([value, label]) => <label key={value} className={alerts.includes(value) ? 'checked' : ''}><input type="checkbox" checked={alerts.includes(value)} onChange={e => setAlerts(e.target.checked ? [...alerts, value] : alerts.filter(a => a !== value))} />{label}</label>)}</div></fieldset>
    <label>Notes & gift ideas<textarea name="notes" rows={3} placeholder="A little detail to help your future self…" defaultValue={reminder?.notes} /></label>
    {error && <div className="form-error">{error}</div>}
    <div className="dialog-footer">{reminder ? <button type="button" className="danger-button" disabled={busy} onClick={async () => { if (!confirm('Delete this reminder? This cannot be undone.')) return; setBusy(true); try { await onDelete(); } catch { setError('Could not delete reminder.'); setBusy(false); } }}><Trash2 size={16} /> Delete reminder</button> : <span className="muted small">One less thing to keep in your head.</span>}<button className="primary-button" disabled={busy || !alerts.length}>{busy && <LoaderCircle size={16} className="spin" />}{reminder ? 'Save changes' : 'Create reminder'}</button></div>
  </form>;
}
