import { PrismaClient } from '@prisma/client';
import { addDays, format } from 'date-fns';

const globalDb = globalThis as unknown as { prisma?: PrismaClient; seed?: Promise<void> };
export const db = globalDb.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalDb.prisma = db;

export async function initialize() {
  if (!globalDb.seed) globalDb.seed = (async () => {
    const settings = await db.settings.findUnique({ where: { id: 'default' } });
    if (settings) return;
    const date = (days: number) => new Date(format(addDays(new Date(), days), 'yyyy-MM-dd') + 'T12:00:00Z');
    await db.$transaction([
      db.settings.create({ data: { id: 'default' } }),
      db.reminder.createMany({ data: [
        { title: "Emma’s birthday", category: 'Birthday', date: date(2), recurrence: 'Yearly', notes: 'Loves ceramics, good coffee, and little adventures.\nGift idea: pottery workshop for two.' },
        { title: 'Passport renewal', category: 'Document', date: date(5), notes: 'Book an appointment and bring a recent passport photo.', reference: 'Ends in 4829', alerts: '180,90,30,7,0' },
        { title: 'Dental check-up', category: 'Health', date: date(7), recurrence: 'Custom', intervalDays: 180, notes: 'Dr. Sarah Mitchell · Bright Smile Dental' },
        { title: 'Wedding anniversary', category: 'Birthday', date: date(12), recurrence: 'Yearly', notes: 'Make a reservation at our favorite restaurant.' },
        { title: 'Car insurance', category: 'Document', date: date(18), notes: 'Compare renewal quotes before auto-renewal.', reference: 'POL-2026-1842' },
        { title: 'Annual health screening', category: 'Health', date: date(24), recurrence: 'Yearly', notes: 'Remember to fast for 8 hours beforehand.' },
        { title: "Dad’s birthday", category: 'Birthday', date: date(36), recurrence: 'Yearly', notes: 'Gift idea: a new gardening kit.' },
        { title: 'Driver’s license', category: 'Document', date: date(85), notes: 'Renew online or visit the local office.', alerts: '180,90,30,7,0' },
        { title: 'Eye examination', category: 'Health', date: date(110), recurrence: 'Yearly', notes: 'Bring current glasses.' },
        { title: 'Home insurance', category: 'Document', date: date(210), notes: 'Review coverage for the coming year.' },
      ] }),
    ]);
  })().catch(error => { globalDb.seed = undefined; throw error; });
  await globalDb.seed;
}
