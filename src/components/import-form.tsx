'use client';
import { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, ArrowRight, Check, LoaderCircle } from 'lucide-react';
import { categories, reminderSchema, type ReminderInput } from '@/lib/reminders';

const fields = ['title', 'category', 'date', 'recurrence', 'intervalDays', 'notes'] as const;
const aliases = { title: /name|title|person/i, category: /category|type/i, date: /date|expiry|birthday/i, recurrence: /recurrence|repeat/i, intervalDays: /interval|every.*days/i, notes: /notes|gift|description/i };
export function ImportForm({ onImport }: { onImport: (rows: ReminderInput[]) => Promise<void> }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<{ headers: string[]; rows: string[][] }>();
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<ReminderInput[]>();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  async function parse(file?: File) {
    setBusy(true); setError('');
    try {
      const form = new FormData(); if (file) form.set('file', file); else form.set('text', text);
      const response = await fetch('/api/import', { method: 'POST', body: form });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setData(result); setMapping(Object.fromEntries(fields.map(field => [field, result.headers.findIndex((h: string) => aliases[field].test(h))])));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not read file.'); } finally { setBusy(false); }
  }
  function buildPreview() {
    if (!data) return;
    const rows = data.rows.map(row => {
      const get = (field: string) => row[mapping[field]] || '';
      const raw = get('date');
      const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : !isNaN(Date.parse(raw)) ? new Date(raw).toISOString().slice(0, 10) : raw;
      const category = categories.find(c => c.toLowerCase() === get('category').toLowerCase().replace(/s$/, '')) || (get('category').toLowerCase().includes('birth') ? 'Birthday' : 'Custom');
      return { title: get('title'), category, date: parsedDate, recurrence: (get('recurrence').toLowerCase() === 'yearly' ? 'Yearly' : get('recurrence').toLowerCase() === 'custom' ? 'Custom' : 'Once') as ReminderInput['recurrence'], intervalDays: Number(get('intervalDays')) || null, notes: get('notes'), reference: '', alerts: '30,7,0' };
    });
    setPreview(rows);
  }
  const invalid = preview?.findIndex(row => !reminderSchema.safeParse(row).success) ?? -1;
  return <div className="import-form">
    {!data ? <><input ref={fileInput} type="file" accept=".xlsx,.csv,.docx,.txt" hidden onChange={e => e.target.files?.[0] && parse(e.target.files[0])} /><button type="button" className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) parse(e.dataTransfer.files[0]); }} onClick={() => fileInput.current?.click()}><span className="upload-icon"><UploadCloud size={28} /></span><strong>Bring your reminders together</strong><span>Drop a file here, or <b>browse files</b></span><small>Excel, CSV, Word or text · Up to 5 MB</small></button><div className="or-divider">or paste your data</div><textarea rows={4} value={text} onChange={e => setText(e.target.value)} placeholder={'Title,Category,Date,Recurrence,Notes\nEmma’s birthday,Birthday,2027-04-18,Yearly,Gift ideas'} /><div className="import-hint"><FileSpreadsheet size={17} /><span>Include a header row. For Word files, use comma- or tab-separated text. Use YYYY-MM-DD dates for best results.</span></div><div className="dialog-footer"><span /><button className="primary-button" disabled={!text || busy} onClick={() => parse()}>{busy ? <LoaderCircle size={16} className="spin" /> : 'Preview data'}<ArrowRight size={16} /></button></div></> : !preview ? <><div className="import-success"><Check size={18} /> Found {data.rows.length} reminders. Let’s match your columns.</div><div className="mapping-list">{fields.map(field => <label key={field}>{field === 'date' ? 'Target date' : field}<select value={mapping[field]} onChange={e => setMapping({ ...mapping, [field]: Number(e.target.value) })}><option value={-1}>Not mapped</option>{data.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></label>)}</div><div className="dialog-footer"><button className="secondary-button" onClick={() => setData(undefined)}>Back</button><button className="primary-button" disabled={mapping.title < 0 || mapping.date < 0} onClick={buildPreview}>Review reminders<ArrowRight size={16} /></button></div></> : <><p className="muted small">Review and correct your titles, categories, dates and recurrence before importing.</p><div className="preview-table"><div className="preview-row preview-label"><span>Title</span><span>Category</span><span>Date</span><span>Repeat</span></div>{preview.map((row, index) => <div className={`preview-row ${!reminderSchema.safeParse(row).success ? 'invalid' : ''}`} key={index}><input aria-label={`Row ${index + 1} title`} value={row.title} onChange={e => setPreview(preview.map((r, i) => i === index ? { ...r, title: e.target.value } : r))} /><select aria-label={`Row ${index + 1} category`} value={row.category} onChange={e => setPreview(preview.map((r, i) => i === index ? { ...r, category: e.target.value as ReminderInput['category'] } : r))}>{categories.map(c => <option key={c}>{c}</option>)}</select><input aria-label={`Row ${index + 1} date`} type="date" value={row.date} onChange={e => setPreview(preview.map((r, i) => i === index ? { ...r, date: e.target.value } : r))} /><select aria-label={`Row ${index + 1} recurrence`} value={row.recurrence} onChange={e => setPreview(preview.map((r, i) => i === index ? { ...r, recurrence: e.target.value as ReminderInput['recurrence'] } : r))}><option>Once</option><option>Yearly</option><option>Custom</option></select>{row.recurrence === 'Custom' && <label className="small">Every <input aria-label={`Row ${index + 1} interval days`} type="number" min={1} max={3650} value={row.intervalDays || ''} onChange={e => setPreview(preview.map((r, i) => i === index ? { ...r, intervalDays: Number(e.target.value) } : r))} /> days</label>}</div>)}</div>{invalid >= 0 && <p className="form-error">Please fix the title, date, or recurrence interval in row {invalid + 1}.</p>}<div className="dialog-footer"><button className="secondary-button" onClick={() => setPreview(undefined)}>Back to mapping</button><button className="primary-button" disabled={busy || invalid >= 0} onClick={async () => { setBusy(true); try { await onImport(preview); } catch (e) { setError(e instanceof Error ? e.message : 'Import failed'); } finally { setBusy(false); } }}>{busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}Import {preview.length} reminders</button></div></>}
    {error && <p className="form-error">{error}</p>}
  </div>;
}
