import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { Header } from '@/components/Header';
import { getSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: "Glen's Madness of March — Bracket Contest",
  description: "NCAA March Madness bracket contest — Glen's Madness of March",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = headers().get('x-pathname') ?? '';
  const session = await getSession();
  const isContestSelectionScreen = pathname === '/' && !session;

  return (
    <html lang="en">
      <body>
        {!isContestSelectionScreen && (
          <div className="bg-logo" aria-hidden>
            <img src="/glensmadness.png" alt="" />
          </div>
        )}
        <div className="page-wrap">
          {!isContestSelectionScreen && <Header />}
          {children}
        </div>
      </body>
    </html>
  );
}
