'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, LayoutDashboard, Cake, Files, HeartPulse, Settings2, ArrowUpRight, Plus, Search, ChevronDown, ChevronLeft, ChevronRight, Bell, Upload, CalendarDays, ListFilter, MoreHorizontal, Repeat2, Check, ArrowRight, Sun, Moon, X, Menu, CircleAlert, CircleHelp, ShieldCheck, Leaf, LoaderCircle, CheckCheck, CalendarClock } from 'lucide-react';
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, addDays, getDay, differenceInYears } from 'date-fns';
import { categories, daysUntil, nextDate, urgency, type Reminder, type ReminderInput } from '@/lib/reminders';
import { Dialog } from '@/components/ui/dialog';
import { ReminderForm } from '@/components/reminder-form';
import { ImportForm } from '@/components/import-form';
import { SettingsPanel } from '@/components/settings-panel';
import { AnalyticsPanel } from '@/components/analytics-panel';
import { defaultSettings, settingsSchema, weekdays, type Settings, type DeliveryStatus } from '@/lib/settings';

const categoryIcons = { Birthday: Cake, Document: Files, Health: HeartPulse, Custom: CalendarDays };
const categoryNames = { Birthday: 'Birthdays & anniversaries', Document: 'Documents', Health: 'Health & wellness', Custom: 'Personal' };
function applyPreferences(settings: Settings) {
  const root = document.documentElement;
  root.dataset.theme = settings.theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : settings.theme;
  root.dataset.density = settings.density;
  root.dataset.motion = settings.reduceMotion ? 'reduced' : 'full';
}

async function api(url: string, method = 'GET', body?: unknown) {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
  return result;
}

const categoryRoutes: Record<string, string> = { All: '/', Birthday: '/birthdays', Document: '/documents', Health: '/health', Custom: '/personal' };
export function Dashboard({ initialCategory = 'All' }: { initialCategory?: string }) {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState('All upcoming');
  const [modal, setModal] = useState<'add' | 'edit' | 'import' | 'settings' | 'notifications' | 'help' | null>(null);
  const [editing, setEditing] = useState<Reminder>();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [delivery, setDelivery] = useState<DeliveryStatus>({ configured: false, sent: 0, lastSent: null });
  const [toast, setToast] = useState('');
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [sort, setSort] = useState<'date' | 'name'>('date');
  const [today] = useState(new Date());
  const load = useCallback(async () => {
    try { const data = await api('/api/reminders'); setReminders(data); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load reminders'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); api('/api/settings').then(data => { const preferences = settingsSchema.parse(data); setSettings(preferences); setDelivery(data.delivery); applyPreferences(preferences); setDark(document.documentElement.dataset.theme === 'dark'); }).catch(() => setToast('Could not load preferences. Default settings are being used.')); }, [load]);
  useEffect(() => { const media = matchMedia('(prefers-color-scheme: dark)'); const onChange = () => { if (settings.theme === 'system') { applyPreferences(settings); setDark(media.matches); } }; media.addEventListener('change', onChange); return () => media.removeEventListener('change', onChange); }, [settings]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.getElementById('global-reminder-search')?.focus(); } }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, []);
  async function savePreferences(preferences: Settings) {
    const result = await api('/api/settings', 'PUT', preferences);
    const saved = settingsSchema.parse(result);
    setSettings(saved); applyPreferences(saved); setDark(document.documentElement.dataset.theme === 'dark');
  }
  const toggleTheme = async () => { try { await savePreferences({ ...settings, theme: dark ? 'light' : 'dark' }); } catch { setToast('Could not save theme. Please try again.'); } };
  const counts = useMemo(() => ({ week: reminders.filter(r => daysUntil(r) >= 0 && daysUntil(r) <= 7).length, month: reminders.filter(r => daysUntil(r) >= 0 && daysUntil(r) <= 30).length, documents: reminders.filter(r => r.category === 'Document' && daysUntil(r) <= settings.documentWarningDays).length }), [reminders, settings.documentWarningDays]);
  const filtered = useMemo(() => reminders.filter(r => {
    const days = daysUntil(r);
    return (category === 'All' || r.category === category) && `${r.title} ${r.notes} ${r.reference} ${r.category}`.toLowerCase().includes(search.toLowerCase()) && (range === 'All upcoming' || (range === 'Next 7 days' ? days >= 0 && days <= 7 : range === 'Next 30 days' ? days >= 0 && days <= 30 : range === 'Overdue' ? days < 0 : range === 'Due today' ? days === 0 : r.category === 'Document' && days <= settings.documentWarningDays)) && (!selectedDay || isSameDay(nextDate(r), selectedDay));
  }).sort((a, b) => sort === 'date' ? daysUntil(a) - daysUntil(b) : a.title.localeCompare(b.title)), [reminders, category, search, range, selectedDay, sort, settings.documentWarningDays]);
  const attention = reminders.filter(r => urgency(r, settings.documentWarningDays) !== 'safe');
  const urgent = reminders.filter(r => daysUntil(r) <= 7);
  function openReminder(reminder: Reminder) { setEditing(reminder); setModal('edit'); }
  function navigate(value: string) { setCategory(value); setRange('All upcoming'); setSelectedDay(undefined); setSidebarOpen(false); router.push(categoryRoutes[value] ?? '/'); }
  async function save(input: ReminderInput) {
    await api(editing && modal === 'edit' ? `/api/reminders/${editing.id}` : '/api/reminders', editing && modal === 'edit' ? 'PUT' : 'POST', input);
    setModal(null); await load(); setToast(editing && modal === 'edit' ? 'Reminder updated. Looking out for future you.' : 'Reminder added. We’ll keep an eye on it.');
  }
  function renderReminder(reminder: Reminder) {
    const Icon = categoryIcons[reminder.category];
    const days = daysUntil(reminder);
    const date = nextDate(reminder);
    const age = reminder.category === 'Birthday' && reminder.recurrence === 'Yearly' ? differenceInYears(date, new Date(reminder.date)) : 0;
    return <button className="reminder-row" key={reminder.id} onClick={() => openReminder(reminder)}>
      <span className={`category-icon ${reminder.category.toLowerCase()}`}><Icon size={21} strokeWidth={1.65} /></span>
      <span className="reminder-main"><strong>{reminder.title}</strong><span>{reminder.category === 'Birthday' ? (reminder.title.toLowerCase().includes('anniversary') ? 'Anniversary' : 'Birthday') : reminder.category === 'Document' ? `${reminder.documentType || 'Document'}${reminder.person ? ` · ${reminder.person}` : ''}` : reminder.category === 'Health' ? `${reminder.healthType || 'Health & wellness'}${reminder.person ? ` · ${reminder.person}` : ''}` : 'Personal reminder'}{reminder.recurrence !== 'Once' && <><i /> <Repeat2 size={11} />{reminder.recurrence === 'Yearly' ? 'Yearly' : `Every ${reminder.intervalDays} days`}</>}{age > 0 && ` · ${age} years`}</span></span>
      <span className="reminder-date"><strong>{format(date, settings.dateFormat)}</strong><span>{format(date, 'EEEE')}</span></span>
      <span className={`due-badge ${urgency(reminder, settings.documentWarningDays)}`}><i />{days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}</span>
      <span className="row-more"><MoreHorizontal size={19} /></span>
    </button>;
  }
  const calendarDays = eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) });
  const heading = category === 'All' ? 'Dashboard' : categoryNames[category as keyof typeof categoryNames];
  const initials = settings.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  const calendarOffset = (getDay(startOfMonth(calendarMonth)) - settings.weekStartsOn + 7) % 7;
  function filterFromAnalytics(value: string, selectedCategory = 'All') { setCategory(selectedCategory); setRange(value); setSelectedDay(undefined); setSearch(''); setView('list'); requestAnimationFrame(() => document.getElementById('reminder-feed')?.scrollIntoView({ behavior: settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })); }
  return <div className="app-shell">
    {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <a className="brand" href="/" aria-label="PulseRemind home"><span className="brand-mark"><Activity size={24} strokeWidth={2.3} /></span><span>pulse<span className="brand-light">remind</span><span className="brand-dot">.</span></span></a>
      <div className="workspace"><span className="workspace-avatar">P<span /></span><span><strong>{settings.workspaceName}</strong><small>A little peace of mind</small></span><ChevronDown size={15} /></div>
      <div className="nav-label">WORKSPACE</div>
      <nav><button className={category === 'All' && view === 'list' ? 'nav-item active' : 'nav-item'} onClick={() => { navigate('All'); setView('list'); }}><LayoutDashboard size={18} />Dashboard<span className="nav-count">{reminders.length}</span></button><button className={view === 'calendar' ? 'nav-item active' : 'nav-item'} onClick={() => { setView('calendar'); navigate('All'); }}><CalendarDays size={18} />Calendar<span className="soon-label">NEW</span></button></nav>
      <div className="nav-label categories-label">YOUR CATEGORIES</div>
      <nav>{categories.slice(0, 3).map(c => { const Icon = categoryIcons[c]; return <button className={`nav-item ${category === c ? 'active' : ''}`} onClick={() => navigate(c)} key={c}><Icon size={18} /><span>{c === 'Birthday' ? 'Birthdays & anniversaries' : c === 'Health' ? 'Health & wellness' : 'Documents'}</span><span className={`nav-dot ${c.toLowerCase()}`} /></button>; })}</nav>
      <button className="nav-item import-nav" onClick={() => setModal('import')}><Upload size={18} />Import reminders<ArrowUpRight size={14} /></button>
      <div className="sidebar-bottom"><div className="peace-card"><span className="peace-illustration"><Leaf size={25} strokeWidth={1.5} /><Sun size={13} className="peace-spark" /></span><strong>More living.<br />Less remembering.</strong><p>Make room for what matters.<br />We’ll handle the reminders.</p><button onClick={() => { setEditing(undefined); setModal('add'); }}>Add a little peace of mind <ArrowRight size={14} /></button></div><button className="nav-item" onClick={() => setModal('settings')}><Settings2 size={18} />Settings</button><button className="nav-item" onClick={() => setModal('help')}><CircleHelp size={18} />Help & getting started<ArrowUpRight size={14} /></button><div className="profile"><span className="profile-avatar">{initials}</span><span><strong>{settings.displayName}</strong><small>Just for you</small></span><button className="icon-button" aria-label="Workspace settings" onClick={() => setModal('settings')}><MoreHorizontal size={18} /></button></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="topbar-search-wrap"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><label className="global-search"><Search size={16} /><input id="global-reminder-search" aria-label="Search all reminders" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search anything..." /><span>⌘ K</span></label></div><div className="topbar-right"><span className="today-date"><CalendarDays size={14} />{format(today, 'EEEE, MMM d')}</span><span className="topbar-divider" /><button className="icon-button" onClick={toggleTheme} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button><button className="icon-button notification-button" aria-label="View notifications" onClick={() => setModal('notifications')}><Bell size={19} />{urgent.length > 0 && <i />}</button><button className="top-profile" onClick={() => setModal('settings')} aria-label="Open profile settings"><span className="top-avatar">{initials}</span><span><strong>{settings.displayName}</strong><small>{settings.email || 'A little peace of mind'}</small></span><ChevronDown size={13} /></button></div></header>
      <main>
        <section className="page-heading"><div><div className="eyebrow"><span /> YOUR PERSONAL COMMAND CENTER</div><h1>{heading}<span className="heading-period">.</span></h1><p>Plan ahead, stay present, and never miss what matters.</p></div><div className="heading-actions"><button className="secondary-button" onClick={() => setModal('import')}><Upload size={16} />Import<span className="desktop-only"> reminders</span></button><button className="primary-button" onClick={() => { setEditing(undefined); setModal('add'); }}><Plus size={17} />Add reminder</button></div></section>
        <section className="stats-grid">
          {[{ label: 'In the next 7 days', count: counts.week, icon: CalendarClock, className: 'stat-sage', note: 'A few things on the horizon', filter: 'Next 7 days' }, { label: 'In the next 30 days', count: counts.month, icon: CalendarDays, className: 'stat-blue', note: 'A little planning goes a long way', filter: 'Next 30 days' }, { label: 'Documents expiring soon', count: counts.documents, icon: Files, className: 'stat-peach', note: `Expired or due within ${settings.documentWarningDays} days`, filter: 'Expiring documents' }, { label: 'Total active reminders', count: reminders.length, icon: Bell, className: 'stat-lavender', note: 'All the important things, covered', filter: 'All upcoming' }].map(stat => <button className={`stat-card ${stat.className}`} key={stat.label} onClick={() => { setRange(stat.filter); setCategory('All'); setSelectedDay(undefined); }}><span className="stat-label">{stat.label}<span className="stat-icon"><ArrowUpRight size={17} strokeWidth={1.5} /></span></span><span className="stat-value">{loading ? '–' : stat.count.toString().padStart(2, '0')}<ArrowUpRight size={19} /></span><span className="stat-note">{stat.note}</span></button>)}
        </section>
        {settings.showAnalytics && <AnalyticsPanel reminders={reminders} documentWarningDays={settings.documentWarningDays} loading={loading} onFilter={filterFromAnalytics} />}
        <div className="dashboard-columns"><div className="feed-column">
          <section className="reminders-panel" id="reminder-feed"><div className="section-heading"><div><h2>{view === 'calendar' ? 'Your calendar' : 'Upcoming reminders'}<span className="count-pill">{filtered.length}</span></h2><p>A heads-up for the moments that matter.</p></div><div className="view-toggle"><button className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')} aria-label="List view"><ListFilter size={16} /></button><button className={view === 'calendar' ? 'selected' : ''} onClick={() => setView('calendar')} aria-label="Calendar view"><CalendarDays size={16} /></button></div></div>
          <div className="feed-controls"><div className="category-tabs">{['All', 'Birthday', 'Document', 'Health'].map(c => { const Icon = c !== 'All' ? categoryIcons[c as keyof typeof categoryIcons] : LayoutDashboard; return <button className={category === c ? 'selected' : ''} key={c} onClick={() => { setCategory(c); setSelectedDay(undefined); }}><Icon size={14} />{c === 'All' ? 'All reminders' : c === 'Birthday' ? 'Birthdays' : c === 'Document' ? 'Documents' : 'Health'}</button>; })}</div><div className="search-filter"><label className="search-field"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your reminders..." />{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={13} /></button>}<kbd>⌕</kbd></label><label className="range-select"><CalendarDays size={14} /><select aria-label="Filter reminders by date" value={range} onChange={e => setRange(e.target.value)}><option>All upcoming</option><option>Next 7 days</option><option>Next 30 days</option><option>Expiring documents</option><option>Due today</option><option>Overdue</option></select><ChevronDown size={13} /></label></div></div>
          {selectedDay && <div className="selected-date-filter">Showing {format(selectedDay, 'MMMM d, yyyy')}<button onClick={() => setSelectedDay(undefined)}><X size={13} />Clear</button></div>}
          {error && <div className="form-error">{error}<button onClick={load}>Try again</button></div>}
          {view === 'list' ? <><div className="list-columns"><span>REMINDER</span><button onClick={() => setSort(sort === 'date' ? 'name' : 'date')}>DATE <ChevronDown size={12} /></button><span>STATUS</span></div>{loading ? <div className="empty-state"><LoaderCircle className="spin" size={25} /><p>Getting your reminders ready…</p></div> : filtered.length ? <div className="reminder-list">{filtered.map(renderReminder)}</div> : <div className="empty-state"><CheckCheck size={32} /><h3>A little breathing room.</h3><p>{search || selectedDay ? 'No reminders match your filters.' : 'No reminders here yet. Add something worth remembering.'}</p><button className="secondary-button" onClick={() => { setEditing(undefined); setModal('add'); }}><Plus size={15} />Add a reminder</button></div>}</> : <div className="large-calendar"><div className="calendar-navigation"><button className="icon-button" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} aria-label="Previous month"><ChevronLeft size={18} /></button><h3>{format(calendarMonth, 'MMMM yyyy')}</h3><button className="icon-button" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} aria-label="Next month"><ChevronRight size={18} /></button></div><div className="large-calendar-grid">{Array.from({ length: 7 }, (_, i) => weekdays[(i + settings.weekStartsOn) % 7].slice(0, 3)).map(d => <div className="large-calendar-weekday" key={d}>{d}</div>)}{Array.from({ length: calendarOffset }, (_, i) => <div className="calendar-blank" key={`blank${i}`} />)}{calendarDays.map(date => <div className={`large-calendar-day ${isSameDay(date, today) ? 'is-today' : ''}`} key={date.toISOString()}><span>{format(date, 'd')}</span>{filtered.filter(r => isSameDay(nextDate(r), date)).map(r => <button key={r.id} className={`calendar-event ${r.category.toLowerCase()}`} onClick={() => openReminder(r)}>{r.title}</button>)}</div>)}</div></div>}
          <div className="feed-footer"><span><span className="safe-dot" />{filtered.length} reminders · All in one place</span><span>Made for a lighter mind <Leaf size={12} /></span></div></section>
          <div className="bottom-note"><span className="note-icon"><ShieldCheck size={20} strokeWidth={1.6} /></span><div><strong>Your important moments. Safely remembered.</strong><p>A birthday, a check-up, a renewal. A little reminder can make all the difference.</p></div><span className="bottom-note-decoration"><Leaf size={26} strokeWidth={1} /></span></div>
        </div><aside className="right-column"><section className="mini-calendar"><div className="calendar-title"><h3>{format(calendarMonth, 'MMMM yyyy')}</h3><div><button className="icon-button" aria-label="Previous month" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}><ChevronLeft size={16} /></button><button className="icon-button" aria-label="Next month" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}><ChevronRight size={16} /></button></div></div><div className="mini-calendar-grid">{Array.from({ length: 7 }, (_, i) => weekdays[(i + settings.weekStartsOn) % 7][0]).map((d, i) => <span className="weekday" key={i}>{d}</span>)}{Array.from({ length: calendarOffset }, (_, i) => <span className="outside-day" key={`p${i}`}>{format(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i - (calendarOffset) + 1), 'd')}</span>)}{calendarDays.map(date => { const events = reminders.filter(r => isSameDay(nextDate(r), date)); return <button key={date.toISOString()} className={`${isSameDay(date, today) ? 'today' : ''} ${selectedDay && isSameDay(date, selectedDay) ? 'day-selected' : ''}`} onClick={() => { setSelectedDay(selectedDay && isSameDay(selectedDay, date) ? undefined : date); setView('list'); setRange('All upcoming'); }} aria-label={`View reminders for ${format(date, 'MMMM d')}`}><span>{format(date, 'd')}</span><span className="calendar-dots">{events.slice(0, 3).map(r => <i className={r.category.toLowerCase()} key={r.id} />)}</span></button>; })}</div><div className="calendar-legend"><span><i className="birthday" />Birthdays</span><span><i className="document" />Documents</span><span><i className="health" />Health</span></div></section>
          <section className="attention-card"><div className="attention-heading"><span><span className="attention-symbol"><CircleAlert size={13} /></span> A little attention</span><span className="attention-count">{attention.length}</span></div><p>A few things worth getting ahead of.</p>{reminders.filter(r => r.category === 'Document' && daysUntil(r) <= settings.documentWarningDays).sort((a, b) => daysUntil(a) - daysUntil(b)).slice(0, 2).map(r => <button className="attention-item" key={r.id} onClick={() => openReminder(r)}><span className={`attention-item-icon ${urgency(r, settings.documentWarningDays)}`}><Files size={17} /></span><span><strong>{r.title}</strong><small>{daysUntil(r) < 0 ? 'Expired — time to renew' : `Expires in ${daysUntil(r)} days`}</small></span><ChevronRight size={15} /></button>)}<button className="attention-link" onClick={() => { setCategory('Document'); setRange('Expiring documents'); setSelectedDay(undefined); }}>Review your documents<ArrowRight size={14} /></button></section>
          <section className="digest-card"><span className="digest-icon"><Bell size={19} strokeWidth={1.6} /><span /></span><span className="tiny-eyebrow">A CALMER START TO YOUR WEEK</span><h3>Your week, at a glance.</h3><p>A thoughtful {weekdays[settings.digestDay]} digest of what’s coming up. Straight to your inbox.</p><button onClick={() => setModal('settings')}>{settings.weeklyDigest ? 'Manage weekly digest' : 'Set up weekly digest'}<ArrowUpRight size={15} /></button><span className="digest-fineprint"><Check size={11} />Just the important things. No noise.</span></section>
        </aside></div>
        <footer className="page-footer"><span>Less mental clutter. More room for life.</span><span><span className="footer-dot" />You’re in your personal space</span></footer>
      </main>
    </div>
    <Dialog open={modal === 'add' || modal === 'edit'} onOpenChange={open => !open && setModal(null)} title={modal === 'edit' ? 'A moment worth remembering' : 'Make room for a reminder'} description={modal === 'edit' ? 'Keep the details up to date. Your future self will thank you.' : 'Add an important date. Let us do the remembering.'}><ReminderForm reminders={reminders} defaultCategory={settings.defaultCategory} defaultAlerts={settings.defaultAlerts} key={editing?.id || 'new'} reminder={modal === 'edit' ? editing : undefined} onSave={save} onDelete={async () => { if (!editing) return; await api(`/api/reminders/${editing.id}`, 'DELETE'); setModal(null); await load(); setToast('Reminder deleted.'); }} /></Dialog>
    <Dialog open={modal === 'import'} onOpenChange={open => !open && setModal(null)} title="Your dates, all together" description="Import your important moments. We’ll help you organize the details." wide><ImportForm onImport={async rows => { await api('/api/reminders', 'POST', rows); setModal(null); await load(); setToast(`${rows.length} reminders imported. A little more organized.`); }} /></Dialog>
    <Dialog open={modal === 'settings'} onOpenChange={open => !open && setModal(null)} title="Settings & preferences" description="A thoughtful workspace, tailored to you." wide><SettingsPanel settings={settings} delivery={delivery} reminders={reminders} onClose={() => setModal(null)} onSave={async value => { await savePreferences(value); setModal(null); setToast('Preferences saved. Your workspace is up to date.'); }} /></Dialog>
    <Dialog open={modal === 'notifications'} onOpenChange={open => !open && setModal(null)} title="A little heads-up" description="Here’s what needs your attention in the next 7 days."><div className="notification-list">{urgent.length ? urgent.sort((a, b) => daysUntil(a) - daysUntil(b)).map(renderReminder) : <div className="empty-state"><CheckCheck size={30} /><h3>You’re all caught up.</h3><p>No urgent reminders right now.</p></div>}</div></Dialog>
    <Dialog open={modal === 'help'} onOpenChange={open => !open && setModal(null)} title="A lighter mind starts here" description="Welcome to PulseRemind. A home for the dates you don’t want to forget."><div className="help-content"><div><span>01</span><section><h3>Save the moments that matter</h3><p>Add birthdays, document expiry dates, health appointments, or a personal reminder. Choose yearly or custom recurrence.</p></section></div><div><span>02</span><section><h3>Bring your existing lists</h3><p>Import Excel, CSV, or comma-separated Word documents. Match your columns, check dates, and confirm before saving.</p></section></div><div><span>03</span><section><h3>Get a thoughtful heads-up</h3><p>Choose when you’d like to be reminded, then add your email in Settings. Email delivery needs a configured provider.</p></section></div><button className="primary-button" onClick={() => { setEditing(undefined); setModal('add'); }}>Create your first reminder<ArrowRight size={16} /></button></div></Dialog>
    {toast && <div className="toast" role="status"><span><Check size={16} /></span>{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification"><X size={15} /></button></div>}
  </div>;
}
