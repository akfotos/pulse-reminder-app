import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reminderSchema } from '@/lib/reminders';

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  const { id } = await context.params;
  const parsed = reminderSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const result = await db.reminder.updateMany({ where: { id }, data: { ...parsed.data, date: new Date(parsed.data.date + 'T12:00:00Z') } });
  return NextResponse.json(result, { status: result.count ? 200 : 404 });
}
export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  await db.reminder.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
