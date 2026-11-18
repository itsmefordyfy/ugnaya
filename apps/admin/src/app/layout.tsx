import type { Metadata, Viewport } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { ToastProvider } from '@ugnaya/web-ui';
import { urls } from '@/lib/urls';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap' });

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#F8FAFC', colorScheme: 'light' };

export const metadata: Metadata = {
  metadataBase: new URL(urls.admin),
  title: { default: 'UGNAYA Admin', template: '%s | UGNAYA Admin' },
  robots: { index: false, follow: false, nocache: true },
};

/** Rendered per request: the Content-Security-Policy nonce (proxy.ts) is applied during server rendering. */
export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  await connection();
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-card focus:px-4 focus:py-2">
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
