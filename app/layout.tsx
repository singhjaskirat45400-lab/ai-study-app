import React from 'react';
import './globals.css'; // ◄ This line connects Tailwind!

export const metadata = {
  title: 'Pro AI Study Suite',
  description: 'Your intelligent learning assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}