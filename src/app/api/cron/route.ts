import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { daysUntil, type Reminder } from '@/lib/reminders';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const settings = await db.settings.findUnique({ where: { id: 'default' } });
  if (!settings?.email || (!settings.emailEnabled && !settings.weeklyDigest)) return NextResponse.json({ sent: 0, reason: 'Notifications disabled' });
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return NextResponse.json({ error: 'Email provider is not configured' }, { status: 503 });
  const resend = new Resend(process.env.RESEND_API_KEY);
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const reminders = (await db.reminder.findMany({ where: { archived: false } })).map(r => ({ ...r, date: r.date.toISOString(), createdAt: r.createdAt.toISOString() })) as Reminder[];
  let sent = 0;
  async function deliver(key: string, subject: string, text: string) {
    if (await db.delivery.findUnique({ where: { key } })) return;
    const result = await resend.emails.send({ from: process.env.EMAIL_FROM!, to: settings!.email, subject, text }, { idempotencyKey: key });
    if (result.error) throw new Error(result.error.message);
    await db.delivery.upsert({ where: { key }, create: { key }, update: {} });
    sent++;
  }
  try {
    if (settings.emailEnabled) for (const reminder of reminders) {
      const days = daysUntil(reminder, now);
      if (reminder.alerts.split(',').map(Number).includes(days)) await deliver(`${reminder.id}-${day}-${days}`, `${reminder.title} · ${days === 0 ? 'Today' : `in ${days} days`}`, `${reminder.title}\n${reminder.category} · ${days === 0 ? 'Due today' : `Due in ${days} days`}\n\n${reminder.notes}`);
    }
    if (settings.weeklyDigest && now.getUTCDay() === 1) {
      const upcoming = reminders.filter(r => daysUntil(r, now) >= 0 && daysUntil(r, now) <= 7);
      await deliver(`digest-${day}`, 'Your week ahead · PulseRemind', upcoming.length ? upcoming.map(r => `${r.title} — in ${daysUntil(r, now)} days`).join('\n') : 'A little breathing room. You have no reminders due in the next 7 days.');
    }
    return NextResponse.json({ sent });
  } catch { return NextResponse.json({ error: 'Email delivery failed. The next run can safely retry.' }, { status: 502 }); }
}
