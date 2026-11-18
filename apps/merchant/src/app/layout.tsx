import type { Metadata, Viewport } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import type { ReactNode } from 'react';
import { ToastProvider } from '@ugnaya/web-ui';
import { SITE_NAME } from '@/lib/site';
import { urls } from '@/lib/urls';
import './globals.css';

// Inter (400 to 800) is the text face; Montserrat (600 to 800) is for the wordmark and headings only, never below
// 18 px and never for data.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Light is the default whatever the system says; dark is opt-in with data-theme="dark".
  themeColor: '#F8FAFC',
  colorScheme: 'light',
};

export const metadata: Metadata = {
  metadataBase: new URL(urls.merchant),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  // The portal is private: never indexed.
  robots: { index: false, follow: false },
};

/** The document shell only; each route group brings its own chrome. */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-card focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
