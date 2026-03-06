import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: "Glen's Madness of March — Bracket Contest",
  description: "NCAA March Madness bracket contest — Glen's Madness of March",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="bg-logo" aria-hidden>
          <img src="/glensmadness.png" alt="" />
        </div>
        <div className="page-wrap">
          <Header />
          {children}
        </div>
      </body>
    </html>
  );
}
