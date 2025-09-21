// src/app/layout.tsx
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>LegacyLeap AS/400 Modernization Assistant</title>
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}