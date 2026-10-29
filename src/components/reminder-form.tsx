'use client';
import { useState } from 'react';
import { Trash2, LoaderCircle, Bell } from 'lucide-react';
import { categories, documentTypes, type Reminder, type ReminderInput } from '@/lib/reminders';
import { format, differenceInCalendarDays } from 'date-fns';

export function ReminderForm({ reminder, onSave, onDelete, defaultCategory = 'Birthday', defaultAlerts = '30,7,0' }: { reminder?: Reminder; onSave: (input: ReminderInput) => Promise<void>; onDelete: () => Promise<void>; defaultCategory?: ReminderInput['category']; defaultAlerts?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState(reminder?.category || defaultCategory);
  const [title, setTitle] = useState(reminder?.title || '');
  const [titleTouched, setTitleTouched] = useState(!!reminder);
  const [docType, setDocType] = useState(reminder?.documentType || '');
  const [person, setPerson] = useState(reminder?.person || '');
  const [date, setDate] = useState(reminder?.date.slice(0, 10) || format(new Date(), 'yyyy-MM-dd'));
  const [recurrence, setRecurrence] = useState(reminder?.recurrence || 'Once');
  const [alerts, setAlerts] = useState((reminder?.alerts || defaultAlerts).split(','));
  const isDocument = category === 'Document';
  const suggestedTitle = `${person ? `${person}’s ` : ''}${docType || ''}`.trim();
  const composeTitle = (nextType: string, nextPerson: string) => { if (!titleTouched) { const suggestion = `${nextPerson ? `${nextPerson}’s ` : ''}${nextType}`.trim(); if (suggestion) setTitle(suggestion); } };
  const daysOut = /^\d{4}-\d{2}-\d{2}$/.test(date) ? differenceInCalendarDays(new Date(date + 'T12:00:00'), new Date()) : null;
  return <form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); const data = new FormData(e.currentTarget); try { await onSave({ title, category: category as ReminderInput['category'], documentType: isDocument ? docType : '', person: isDocument ? person : String(data.get('person') || ''), date: String(data.get('date')), recurrence: recurrence as ReminderInput['recurrence'], intervalDays: recurrence === 'Custom' ? Number(data.get('intervalDays')) : null, notes: String(data.get('notes')), reference: String(data.get('reference')), alerts: alerts.join(',') }); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); } finally { setBusy(false); } }} className="reminder-form">
    {isDocument && <div className="form-grid"><label>Document type<select name="documentType" value={docType} onChange={e => { setDocType(e.target.value); composeTitle(e.target.value, person); }}><option value="">Choose a document type…</option>{documentTypes.map(type => <option key={type}>{type}</option>)}</select></label><label>Belongs to <span className="optional">whose document is this?</span><input name="person" placeholder="e.g. Emma" value={person} onChange={e => { setPerson(e.target.value); composeTitle(docType, e.target.value); }} maxLength={100} /></label></div>}
    <label>{isDocument ? 'Document name' : 'Reminder title'}<input name="title" placeholder={isDocument ? 'e.g. Emma’s passport' : 'e.g. Emma’s birthday'} required maxLength={200} value={title} onChange={e => { setTitle(e.target.value); setTitleTouched(true); }} autoFocus />{isDocument && !titleTouched && suggestedTitle && <small className="field-hint">We’ll name this “{suggestedTitle}” for you — edit anytime.</small>}</label>
    {!isDocument && <label>Person <span className="optional">optional</span><input name="person" placeholder="e.g. Emma" defaultValue={reminder?.person} maxLength={100} /></label>}
    <div className="form-grid"><label>Category<select name="category" value={category} onChange={e => setCategory(e.target.value as ReminderInput['category'])}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>{isDocument ? 'Expiry date' : 'Target date'}<input type="date" name="date" required value={date} onChange={e => setDate(e.target.value)} />{isDocument && daysOut !== null && <small className="field-hint">{daysOut < 0 ? `Expired ${Math.abs(daysOut)} days ago` : daysOut === 0 ? 'Expires today' : `Expires in ${daysOut} days`}</small>}</label></div>
    <div className="form-grid"><label>Recurrence<select value={recurrence} onChange={e => setRecurrence(e.target.value as ReminderInput['recurrence'])}><option>Once</option><option>Yearly</option><option>Custom</option></select></label>{recurrence === 'Custom' ? <label>Repeat every (days)<input name="intervalDays" type="number" min={1} max={3650} required defaultValue={reminder?.intervalDays || 180} /></label> : <label>Reference number <span className="optional">optional</span><input name="reference" defaultValue={reminder?.reference} placeholder={isDocument ? 'Document or license number' : 'Policy or document number'} /></label>}</div>
    {recurrence === 'Custom' && <label>Reference number<input name="reference" defaultValue={reminder?.reference} placeholder="Optional reference" /></label>}
    <fieldset><legend><Bell size={15} /> Remind me before</legend><div className="alert-options">{[['180', '6 months'], ['90', '3 months'], ['30', '1 month'], ['7', '1 week'], ['0', 'On the day']].map(([value, label]) => <label key={value} className={alerts.includes(value) ? 'checked' : ''}><input type="checkbox" checked={alerts.includes(value)} onChange={e => setAlerts(e.target.checked ? [...alerts, value] : alerts.filter(a => a !== value))} />{label}</label>)}</div></fieldset>
    <label>{isDocument ? 'Notes' : 'Notes & gift ideas'}<textarea name="notes" rows={3} placeholder={isDocument ? 'Renewal steps, office location, requirements…' : 'A little detail to help your future self…'} defaultValue={reminder?.notes} /></label>
    {error && <div className="form-error">{error}</div>}
    <div className="dialog-footer">{reminder ? <button type="button" className="danger-button" disabled={busy} onClick={async () => { if (!confirm('Delete this reminder? This cannot be undone.')) return; setBusy(true); try { await onDelete(); } catch { setError('Could not delete reminder.'); setBusy(false); } }}><Trash2 size={16} /> Delete reminder</button> : <span className="muted small">One less thing to keep in your head.</span>}<button className="primary-button" disabled={busy || !alerts.length}>{busy && <LoaderCircle size={16} className="spin" />}{reminder ? 'Save changes' : 'Create reminder'}</button></div>
  </form>;
}
