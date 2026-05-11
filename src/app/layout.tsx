import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { initWorkers } from '@/lib/jobs'

// Bootstrap BullMQ workers once on server startup
initWorkers()

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FlowCar — Gestão de Lava-Jatos',
  description: 'Plataforma micro-SaaS para gestão de lava-jatos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
