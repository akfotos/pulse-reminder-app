'use client';
import { useMemo, useState } from 'react';
import { Trash2, LoaderCircle, Bell } from 'lucide-react';
import { categories, documentTypes, healthTypes, type Reminder, type ReminderInput } from '@/lib/reminders';
import { format, differenceInCalendarDays } from 'date-fns';

export function ReminderForm({ reminder, reminders = [], onSave, onDelete, defaultCategory = 'Birthday', defaultAlerts = '30,7,0' }: { reminder?: Reminder; reminders?: Reminder[]; onSave: (input: ReminderInput) => Promise<void>; onDelete: () => Promise<void>; defaultCategory?: ReminderInput['category']; defaultAlerts?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState(reminder?.category || defaultCategory);
  const [title, setTitle] = useState(reminder?.title || '');
  const [titleTouched, setTitleTouched] = useState(!!reminder);
  const [docType, setDocType] = useState(reminder?.documentType || '');
  const [healthType, setHealthType] = useState(() => { const t = reminder?.healthType || ''; return !t || t === 'Physical' ? t : 'Other'; });
  const [customHealthType, setCustomHealthType] = useState(() => { const t = reminder?.healthType || ''; return t === 'Physical' ? '' : t; });
  const [date, setDate] = useState(reminder?.date.slice(0, 10) || format(new Date(), 'yyyy-MM-dd'));
  const [recurrence, setRecurrence] = useState(reminder?.recurrence || 'Once');
  const [alerts, setAlerts] = useState((reminder?.alerts || defaultAlerts).split(','));
  const isDocument = category === 'Document';
  const isHealth = category === 'Health';
  const typeValue = isDocument ? docType : isHealth ? (healthType === 'Other' ? customHealthType : healthType) : '';
  const suggestedTitle = typeValue.trim();
  const composeTitle = (nextType: string) => { if (!titleTouched && nextType.trim()) setTitle(nextType.trim()); };
  const daysOut = /^\d{4}-\d{2}-\d{2}$/.test(date) ? differenceInCalendarDays(new Date(date + 'T12:00:00'), new Date()) : null;
  const titles = useMemo(() => [...new Set(reminders.map(r => r.title))], [reminders]);
  const people = useMemo(() => {
    const names = new Set<string>();
    reminders.forEach(r => {
      if (r.person) names.add(r.person);
      const match = r.title.match(/^([^'’]{1,40})['’]s\b/);
      if (match) names.add(match[1].trim());
    });
    return [...names];
  }, [reminders]);
  return <form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); const data = new FormData(e.currentTarget); try { await onSave({ title, category: category as ReminderInput['category'], documentType: isDocument ? docType : '', person: reminder?.person || '', healthType: isHealth ? (healthType === 'Other' ? customHealthType : healthType) : '', date: String(data.get('date')), recurrence: recurrence as ReminderInput['recurrence'], intervalDays: recurrence === 'Custom' ? Number(data.get('intervalDays')) : null, notes: String(data.get('notes')), reference: String(data.get('reference')), alerts: alerts.join(',') }); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); } finally { setBusy(false); } }} className="reminder-form">
    {isDocument && <label>Document type<select name="documentType" value={docType} onChange={e => { setDocType(e.target.value); composeTitle(e.target.value); }}><option value="">Choose a document type…</option>{documentTypes.map(type => <option key={type}>{type}</option>)}</select></label>}
    {isHealth && <label>Health event type<select name="healthType" value={healthType} onChange={e => { setHealthType(e.target.value); composeTitle(e.target.value === 'Other' ? customHealthType : e.target.value); }}><option value="">Choose a health event…</option>{healthTypes.map(type => <option key={type}>{type}</option>)}</select>{healthType === 'Other' && <input name="healthTypeCustom" placeholder="What kind? e.g. Dental cleaning" value={customHealthType} onChange={e => { setCustomHealthType(e.target.value); composeTitle(e.target.value); }} maxLength={60} required />}</label>}
    <label>{isDocument ? 'Name of person' : isHealth ? 'Health event name' : 'Reminder title'}<input name="title" placeholder={isDocument ? 'Pick a name or type a new one — e.g. Emma’s passport' : isHealth ? 'e.g. Emma’s dental cleaning' : 'e.g. Emma’s birthday'} list={isDocument ? 'people-options' : 'title-options'} required maxLength={200} value={title} onChange={e => { setTitle(e.target.value); setTitleTouched(true); }} autoFocus />{(isDocument || isHealth) && !titleTouched && suggestedTitle && <small className="field-hint">We’ll name this “{suggestedTitle}” for you — edit anytime.</small>}</label>

    <div className="form-grid"><label>Category<select name="category" value={category} onChange={e => setCategory(e.target.value as ReminderInput['category'])}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>{isDocument ? 'Expiry date' : isHealth ? 'Appointment date' : 'Target date'}<input type="date" name="date" required value={date} onChange={e => setDate(e.target.value)} />{(isDocument || isHealth) && daysOut !== null && <small className="field-hint">{daysOut < 0 ? `${isDocument ? 'Expired' : 'Passed'} ${Math.abs(daysOut)} days ago` : daysOut === 0 ? (isDocument ? 'Expires today' : 'Today') : `${isDocument ? 'Expires' : 'In'} ${daysOut} days`}</small>}</label></div>
    <div className="form-grid"><label>Recurrence<select value={recurrence} onChange={e => setRecurrence(e.target.value as ReminderInput['recurrence'])}><option>Once</option><option>Yearly</option><option>Custom</option></select></label>{recurrence === 'Custom' ? <label>Repeat every (days)<input name="intervalDays" type="number" min={1} max={3650} required defaultValue={reminder?.intervalDays || 180} /></label> : <label>Reference number <span className="optional">optional</span><input name="reference" defaultValue={reminder?.reference} placeholder={isDocument ? 'Document or license number' : 'Policy or document number'} /></label>}</div>
    {recurrence === 'Custom' && <label>Reference number<input name="reference" defaultValue={reminder?.reference} placeholder="Optional reference" /></label>}
    <fieldset><legend><Bell size={15} /> Remind me before</legend><div className="alert-options">{[['180', '6 months'], ['90', '3 months'], ['30', '1 month'], ['7', '1 week'], ['0', 'On the day']].map(([value, label]) => <label key={value} className={alerts.includes(value) ? 'checked' : ''}><input type="checkbox" checked={alerts.includes(value)} onChange={e => setAlerts(e.target.checked ? [...alerts, value] : alerts.filter(a => a !== value))} />{label}</label>)}</div></fieldset>
    <label>{isDocument ? 'Notes' : isHealth ? 'Appointment details' : 'Notes & gift ideas'}<textarea name="notes" rows={3} placeholder={isDocument ? 'Renewal steps, office location, requirements…' : isHealth ? 'Doctor, location, prep instructions (e.g. fasting)…' : 'A little detail to help your future self…'} defaultValue={reminder?.notes} /></label>
    <datalist id="people-options">{people.map(name => <option key={name} value={name} />)}</datalist><datalist id="title-options">{titles.map(t => <option key={t} value={t} />)}</datalist>
    {error && <div className="form-error">{error}</div>}
    <div className="dialog-footer">{reminder ? <button type="button" className="danger-button" disabled={busy} onClick={async () => { if (!confirm('Delete this reminder? This cannot be undone.')) return; setBusy(true); try { await onDelete(); } catch { setError('Could not delete reminder.'); setBusy(false); } }}><Trash2 size={16} /> Delete reminder</button> : <span className="muted small">One less thing to keep in your head.</span>}<button className="primary-button" disabled={busy || !alerts.length}>{busy && <LoaderCircle size={16} className="spin" />}{reminder ? 'Save changes' : 'Create reminder'}</button></div>
  </form>;
}
