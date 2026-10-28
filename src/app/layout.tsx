import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'PulseRemind — A little reminder. A lighter mind.', description: 'Your personal space for life’s important dates. Birthdays, documents, and wellbeing, all in one calm place.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
