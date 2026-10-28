import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns';
import { categories, daysUntil, nextDate, urgency, type Reminder } from './reminders';

export function analyzeReminders(reminders: Reminder[], windowDays: number, documentWarningDays = 180, now = new Date()) {
  const today = startOfDay(now);
  const end = addDays(today, windowDays - 1);
  const occurrences: { reminder: Reminder; date: Date }[] = [];
  for (const reminder of reminders) {
    let date = nextDate(reminder, today);
    while (date >= today && date <= end) {
      occurrences.push({ reminder, date });
      if (reminder.recurrence === 'Once') break;
      const next = nextDate(reminder, addDays(date, 1));
      if (next <= date) break;
      date = next;
    }
  }
  const binSize = windowDays === 7 ? 1 : windowDays === 30 ? 5 : 15;
  const bins = Array.from({ length: Math.ceil(windowDays / binSize) }, (_, index) => {
    const start = addDays(today, index * binSize);
    const finish = addDays(today, Math.min(windowDays - 1, (index + 1) * binSize - 1));
    return { start, end: finish, label: binSize === 1 ? format(start, 'EEE') : format(start, 'MMM d'), count: occurrences.filter(item => item.date >= start && item.date <= finish).length };
  });
  const overdue = reminders.filter(r => daysUntil(r, now) < 0);
  const dueToday = reminders.filter(r => daysUntil(r, now) === 0);
  const urgent = reminders.filter(r => daysUntil(r, now) >= 0 && daysUntil(r, now) <= 7);
  const documents = reminders.filter(r => r.category === 'Document' && daysUntil(r, now) <= documentWarningDays);
  const safe = reminders.filter(r => urgency(r, documentWarningDays, now) === 'safe');
  const categoryMix = categories.map(category => ({ category, count: reminders.filter(r => r.category === category).length }));
  const next = [...reminders].filter(r => daysUntil(r, now) >= 0).sort((a, b) => daysUntil(a, now) - daysUntil(b, now))[0];
  return { bins, occurrences, overdue, dueToday, urgent, documents, safe, categoryMix, next, end, distinctUpcoming: new Set(occurrences.map(item => item.reminder.id)).size, daysInWindow: differenceInCalendarDays(end, today) + 1 };
}
