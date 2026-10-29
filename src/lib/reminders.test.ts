import test from 'node:test';
import assert from 'node:assert/strict';
import { format } from 'date-fns';
import { nextDate, daysUntil, urgency, reminderSchema, type Reminder } from './reminders';
import { analyzeReminders } from './analytics';
import { settingsSchema } from './settings';

const today = new Date('2026-10-28T12:00:00');
const makeReminder = (values: Partial<Reminder> = {}): Reminder => ({ id: 'test', title: 'Test reminder', category: 'Custom', documentType: '', healthType: '', person: '', date: '2026-10-28', recurrence: 'Once', notes: '', reference: '', alerts: '30,7,0', ...values });

test('yearly reminders roll forward without becoming overdue', () => {
  const reminder = makeReminder({ date: '1990-10-27', recurrence: 'Yearly' });
  assert.equal(format(nextDate(reminder, today), 'yyyy-MM-dd'), '2027-10-27');
  assert.equal(daysUntil(makeReminder({ date: '1990-10-28', recurrence: 'Yearly' }), today), 0);
});

test('leap-day birthdays clamp in non-leap years and recover in leap years', () => {
  const reminder = makeReminder({ date: '2000-02-29', recurrence: 'Yearly' });
  assert.equal(format(nextDate(reminder, new Date('2027-02-01T12:00:00')), 'yyyy-MM-dd'), '2027-02-28');
  assert.equal(format(nextDate(reminder, new Date('2028-02-01T12:00:00')), 'yyyy-MM-dd'), '2028-02-29');
});

test('custom recurrence uses calendar days and includes today', () => {
  const reminder = makeReminder({ date: '2026-10-14', recurrence: 'Custom', intervalDays: 7 });
  assert.equal(daysUntil(reminder, today), 0);
  assert.equal(format(nextDate(reminder, new Date('2026-10-29T12:00:00')), 'yyyy-MM-dd'), '2026-11-04');
});

test('analytics counts each recurring occurrence, without inventing zero-value bars', () => {
  const reminder = makeReminder({ recurrence: 'Custom', intervalDays: 2 });
  const result = analyzeReminders([reminder], 7, 180, today);
  assert.equal(result.occurrences.length, 4);
  assert.equal(result.distinctUpcoming, 1);
  assert.deepEqual(result.bins.map(bin => bin.count), [1, 0, 1, 0, 1, 0, 1]);
  assert.equal(result.bins.reduce((sum, bin) => sum + bin.count, 0), result.occurrences.length);
});

test('analytics separates past-due once-only reminders from yearly events', () => {
  const result = analyzeReminders([
    makeReminder({ id: 'expired', date: '2026-10-01', category: 'Document' }),
    makeReminder({ id: 'birthday', date: '1990-10-01', recurrence: 'Yearly', category: 'Birthday' }),
    makeReminder({ id: 'today' }),
  ], 30, 180, today);
  assert.deepEqual(result.overdue.map(r => r.id), ['expired']);
  assert.deepEqual(result.dueToday.map(r => r.id), ['today']);
  assert.equal(result.categoryMix.reduce((sum, item) => sum + item.count, 0), 3);
});

test('document attention windows change genuine urgency and analytics consistently', () => {
  const reminder = makeReminder({ category: 'Document', date: '2027-01-01' });
  assert.equal(urgency(reminder, 180, today), 'attention');
  assert.equal(urgency(reminder, 30, today), 'safe');
  assert.equal(analyzeReminders([reminder], 90, 30, today).documents.length, 0);
  assert.equal(analyzeReminders([reminder], 90, 180, today).documents.length, 1);
});

test('empty analytics has no fabricated occurrences or next reminder', () => {
  const result = analyzeReminders([], 90, 180, today);
  assert.equal(result.occurrences.length, 0);
  assert.equal(result.next, undefined);
  assert.ok(result.bins.every(bin => bin.count === 0));
  assert.equal(result.daysInWindow, 90);
});

test('reminder validation rejects invalid dates and missing custom intervals', () => {
  assert.equal(reminderSchema.safeParse(makeReminder({ date: '2026-02-31' })).success, false);
  assert.equal(reminderSchema.safeParse(makeReminder({ recurrence: 'Custom' })).success, false);
  assert.equal(reminderSchema.safeParse(makeReminder({ recurrence: 'Custom', intervalDays: 7 })).success, true);
});

test('settings reject enabled email without a destination and preserve safe defaults', () => {
  assert.equal(settingsSchema.safeParse({ emailEnabled: true }).success, false);
  assert.equal(settingsSchema.safeParse({ digestDay: 7 }).success, false);
  assert.equal(settingsSchema.safeParse({ defaultAlerts: '' }).success, false);
  const settings = settingsSchema.parse({});
  assert.equal(settings.emailEnabled, false);
  assert.equal(settings.weeklyDigest, false);
  assert.equal(settings.documentWarningDays, 180);
  assert.equal(settings.theme, 'light');
});
