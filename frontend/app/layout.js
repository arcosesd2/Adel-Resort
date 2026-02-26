import { Inter, Playfair_Display } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata = {
  title: 'Adel Beach Resort | Luxury Beach Hotel',
  description: 'Experience paradise at Adel Beach Resort. Book your dream beachfront stay with stunning ocean views, world-class amenities, and unforgettable experiences.',
  keywords: 'beach resort, hotel, luxury, ocean view, beach vacation, Adel Beach Resort',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans bg-white text-gray-900 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#333', color: '#fff' },
            success: { style: { background: '#166534' } },
            error: { style: { background: '#991b1b' } },
          }}
        />
      </body>
    </html>
  )
}
