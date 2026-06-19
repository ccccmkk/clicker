import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '🍪 쿠키 클리커',
  description: '쿠키를 클릭해서 제국을 건설하세요!',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
