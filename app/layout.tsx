import { Inter } from 'next/font/google';
import './globals.css';

// 1. Setup Inter to support Cyrillic characters
const inter = Inter({ 
  subsets: ['latin', 'cyrillic'] 
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 2. Set language to Mongolian ('mn')
    <html lang="mn">
      <body className={inter.className}>
        <div className="min-h-screen bg-slate-50">
          {children}
        </div>
      </body>
    </html>
  );
}
