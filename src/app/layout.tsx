import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { PWA_THEME_COLOR } from '@/lib/pwa/theme'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

export const metadata: Metadata = {
  title: {
    default: 'Habit Tracker',
    template: '%s | Habit Tracker',
  },
  description:
    'Rastreie hábitos diários, construa streaks e mantenha sua consistência.',
  manifest: '/manifest.json',
  // Ícones e nome de instalação do PWA — valores provisórios, ver
  // src/lib/pwa/theme.ts e scripts/gerar-icones-pwa.js.
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Life OS',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  // PROVISÓRIO — trocar em src/lib/pwa/theme.ts quando a paleta final
  // for definida (e replicar em public/manifest.json, que é JSON puro).
  themeColor: PWA_THEME_COLOR,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={geist.variable}>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
