import { differenceInCalendarDays, addDays, addYears, startOfDay } from 'date-fns';
import { z } from 'zod';

export const categories = ['Birthday', 'Document', 'Health', 'Custom'] as const;
export const documentTypes = ['Passport', "Driver's License", 'State ID', 'National ID', 'Visa', 'Certification', 'Insurance', 'Vehicle Registration', 'Other'] as const;
export const healthTypes = ['Annual Physical', 'Dental Cleaning', 'Eye Exam', 'Vaccination', 'Medication Refill', 'Blood Work', 'Screening', 'Therapy', 'Other'] as const;
export const reminderSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.enum(categories),
  documentType: z.string().max(60).default(''),
  healthType: z.string().max(60).default(''),
  person: z.string().max(100).default(''),
  date: z.iso.date(),
  recurrence: z.enum(['Once', 'Yearly', 'Custom']),
  intervalDays: z.number().int().min(1).max(3650).nullable().optional(),
  notes: z.string().max(5000).default(''),
  reference: z.string().max(200).default(''),
  alerts: z.string().regex(/^(180|90|30|7|0)(,(180|90|30|7|0))*$/).default('30,7,0'),
}).refine(v => v.recurrence !== 'Custom' || !!v.intervalDays, { message: 'Custom recurrence requires an interval in days', path: ['intervalDays'] });
export type ReminderInput = z.infer<typeof reminderSchema>;
export type Reminder = ReminderInput & { id: string; createdAt?: string };
export function nextDate(reminder: Pick<Reminder, 'date' | 'recurrence' | 'intervalDays'>, today = new Date()) {
  const original = startOfDay(new Date(reminder.date.slice(0, 10) + 'T12:00:00'));
  const now = startOfDay(today);
  if (reminder.recurrence === 'Yearly') {
    let next = addYears(original, Math.max(0, now.getFullYear() - original.getFullYear()));
    if (next < now) next = addYears(original, now.getFullYear() - original.getFullYear() + 1);
    return next;
  }
  if (reminder.recurrence === 'Custom' && reminder.intervalDays && original < now) {
    return addDays(original, Math.ceil(differenceInCalendarDays(now, original) / reminder.intervalDays) * reminder.intervalDays);
  }
  return original;
}
export function daysUntil(reminder: Pick<Reminder, 'date' | 'recurrence' | 'intervalDays'>, today = new Date()) {
  return differenceInCalendarDays(nextDate(reminder, today), startOfDay(today));
}
export function urgency(reminder: Reminder, documentWarningDays = 180, today = new Date()) {
  const days = daysUntil(reminder, today);
  return days <= 7 ? 'urgent' : days <= (reminder.category === 'Document' ? documentWarningDays : 30) ? 'attention' : 'safe';
}
