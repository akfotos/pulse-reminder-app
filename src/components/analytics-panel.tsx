'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, BarChart3, Clock3, Files, CalendarCheck2 } from 'lucide-react';
import { analyzeReminders } from '@/lib/analytics';
import { type Reminder } from '@/lib/reminders';

export function AnalyticsPanel({ reminders, documentWarningDays, loading, onFilter }: { reminders: Reminder[]; documentWarningDays: number; loading: boolean; onFilter: (range: string, category?: string) => void }) {
  const [now] = useState(new Date());
  const analysis = useMemo(() => analyzeReminders(reminders, 30, documentWarningDays, now), [reminders, documentWarningDays, now]);
  return <section className={`analytics-section ${loading ? 'is-loading' : ''}`} aria-label="Workspace analytics" aria-busy={loading}>
    <div className="analytics-toolbar"><div><span className="analytics-kicker"><BarChart3 size={13} /> WORKSPACE INSIGHTS</span><p>Real dates. A clearer picture.</p></div></div>
    <div className="analytics-metrics">{[{ title: 'Due today', value: analysis.dueToday.length, icon: CalendarCheck2, note: 'A good place to start', filter: 'Due today', className: 'today-metric' }, { title: 'Overdue', value: analysis.overdue.length, icon: Clock3, note: 'Past-due, one-time reminders', filter: 'Overdue', className: 'overdue-metric' }, { title: 'Documents to review', value: analysis.documents.length, icon: Files, note: `Expired or due within ${documentWarningDays} days`, filter: 'Expiring documents', className: 'documents-metric' }].map(metric => <button key={metric.title} className={`analytics-metric ${metric.className}`} onClick={() => onFilter(metric.filter, metric.filter === 'Expiring documents' ? 'Document' : 'All')}><span className="metric-symbol"><metric.icon size={17} /></span><span><span>{metric.title}</span><strong>{loading ? '—' : metric.value}</strong><small>{metric.note}</small></span><ArrowUpRight size={15} /></button>)}</div>
    <div className="analytics-scope"><span className="safe-dot" />Based on all {reminders.length} active reminders · List filters don’t change these insights<span>As of {format(now, 'MMM d, yyyy')}</span></div>
  </section>;
}
