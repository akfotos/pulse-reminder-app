import { NextResponse } from 'next/server';
import { db, initialize } from '@/lib/db';
import { settingsSchema } from '@/lib/settings';

export async function GET() {
  await initialize();
  const [settings, sent, last] = await Promise.all([
    db.settings.findUnique({ where: { id: 'default' } }),
    db.delivery.count(),
    db.delivery.findFirst({ orderBy: { sentAt: 'desc' } }),
  ]);
  return NextResponse.json({ ...settings, delivery: { configured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.CRON_SECRET), sent, lastSent: last?.sentAt.toISOString() ?? null } });
}
export async function PUT(request: Request) {
  const parsed = settingsSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  return NextResponse.json(await db.settings.upsert({ where: { id: 'default' }, create: parsed.data, update: parsed.data }));
}
