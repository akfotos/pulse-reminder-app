import { NextResponse } from 'next/server';
import { db, initialize } from '@/lib/db';
import { reminderSchema } from '@/lib/reminders';

export async function GET() {
  await initialize();
  return NextResponse.json(await db.reminder.findMany({ where: { archived: false }, orderBy: { date: 'asc' } }));
}
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = reminderSchema.array().min(1).max(500).safeParse(Array.isArray(body) ? body : [body]);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const result = await db.$transaction(parsed.data.map(item => db.reminder.create({ data: { ...item, date: new Date(item.date + 'T12:00:00Z') } })));
  return NextResponse.json(result, { status: 201 });
}
