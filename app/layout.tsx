import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Glens Madness — Bracket Contest',
  description: 'NCAA March Madness bracket contest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
