import { z } from 'zod';
import { categories } from './reminders';

export const settingsSchema = z.object({
  email: z.union([z.email(), z.literal('')]).default(''),
  emailEnabled: z.boolean().default(false),
  weeklyDigest: z.boolean().default(false),
  displayName: z.string().trim().min(1).max(50).default('My workspace'),
  workspaceName: z.string().trim().min(1).max(50).default('Personal space'),
  digestDay: z.number().int().min(0).max(6).default(1),
  includeNotes: z.boolean().default(true),
  defaultCategory: z.enum(categories).default('Birthday'),
  defaultAlerts: z.string().regex(/^(180|90|30|7|0)(,(180|90|30|7|0))*$/).default('30,7,0'),
  documentWarningDays: z.union([z.literal(30), z.literal(90), z.literal(180)]).default(180),
  dateFormat: z.enum(['MMM d, yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd']).default('MMM d, yyyy'),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).default(1),
  theme: z.enum(['light', 'dark', 'system']).default('light'),
  density: z.enum(['comfortable', 'compact']).default('comfortable'),
  reduceMotion: z.boolean().default(false),
  showAnalytics: z.boolean().default(true),
}).refine(s => !(s.emailEnabled || s.weeklyDigest) || !!s.email, { message: 'Enter an email address to enable notifications.', path: ['email'] });
export type Settings = z.infer<typeof settingsSchema>;
export const defaultSettings = settingsSchema.parse({});
export type DeliveryStatus = { configured: boolean; sent: number; lastSent: string | null };
export const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
