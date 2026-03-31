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
  const hdrs = headers();
  const pathname = hdrs.get('x-pathname') ?? '';
  const headerContest = hdrs.get('x-contest');
  const session = await getSession();

  const isContestSelectionScreen = pathname === '/' && !session;
  const isLoginScreen = pathname === '/login';

  const activeContest: 'basketball' | 'golf' =
    session?.contest === 'golf' || headerContest === 'golf' ? 'golf' : 'basketball';

  const backgroundLogoSrc = activeContest === 'golf' ? '/Dans_Logo.png' : '/glensmadness.png';

  return (
    <html lang="en">
      <body>
        {!isContestSelectionScreen && (
          <div className="bg-logo" aria-hidden>
            <img src={backgroundLogoSrc} alt="" />
          </div>
        )}
        <div className="page-wrap">
          {!isContestSelectionScreen && !isLoginScreen && <Header />}
          {children}
        </div>
      </body>
    </html>
  );
}
