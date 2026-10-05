import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tank Battle',
  description: 'A tank battle game',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}