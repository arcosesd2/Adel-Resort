import { Inter, Playfair_Display } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import InactivityGuard from '@/components/InactivityGuard'
import PageViewTracker from '@/components/PageViewTracker'
import ChatWidget from '@/components/ChatWidget'
import AuthValidator from '@/components/AuthValidator'
import PageTransitionWrapper from '@/components/PageTransitionWrapper'
import JsonLd from '@/components/JsonLd'
import NotificationPopup from '@/components/NotificationPopup'
import ThemeProvider from '@/components/ThemeProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata = {
  metadataBase: new URL('https://adel-resort.ph'),
  title: {
    default: 'Adel Beach Resort | Lawigan, Surigao Del Sur',
    template: '%s | Adel Beach Resort',
  },
  description: 'Book cottages, rooms, and event spaces at Adel Beach Resort in Lawigan, Surigao Del Sur. Day tours and overnight stays available.',
  keywords: 'Adel Beach Resort, Lawigan, Surigao Del Sur, beach resort, cottages, kubo, function hall, day tour, night tour',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://adel-resort.ph',
    siteName: 'Adel Beach Resort',
    title: 'Adel Beach Resort | Lawigan, Surigao Del Sur',
    description: 'Book cottages, rooms, and event spaces at Adel Beach Resort in Lawigan, Surigao Del Sur.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Adel Beach Resort | Lawigan, Surigao Del Sur',
    description: 'Book cottages, rooms, and event spaces at Adel Beach Resort in Lawigan, Surigao Del Sur.',
  },
}

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('adel-theme');
    var theme = stored || 'system';
    var resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    if (resolved === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans min-h-screen flex flex-col antialiased">
        <ThemeProvider>
          <JsonLd data={{
            '@context': 'https://schema.org',
            '@type': 'Hotel',
            name: 'Adel Beach Resort',
            description: 'Beach resort in Lawigan, Surigao Del Sur offering cottages, rooms, and event spaces.',
            url: 'https://adel-resort.ph',
            telephone: '09685361395',
            email: 'arnelarcos@adel-resort.ph',
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Lawigan',
              addressLocality: 'Surigao Del Sur',
              addressCountry: 'PH',
            },
          }} />
          <AuthValidator />
          <Navbar />
          <InactivityGuard />
          <PageViewTracker />
          <main className="flex-1">
            <PageTransitionWrapper>{children}</PageTransitionWrapper>
          </main>
          <Footer />
          <ChatWidget />
          <NotificationPopup />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: '#0a1628', color: '#fbf9f4', border: '1px solid #b08d57' },
              success: { iconTheme: { primary: '#b08d57', secondary: '#0a1628' } },
              error: { style: { background: '#7f1d1d', color: '#fef2f2', border: '1px solid #ef4444' } },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
