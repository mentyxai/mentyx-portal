import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Focus DSCR | Investor Portal',
  description: 'Apply for DSCR, Fix & Flip, and Bridge loans online. Fast, easy, mobile-friendly.',
  keywords: ['DSCR loans', 'fix and flip', 'bridge loans', 'real estate investing', 'hard money'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
