import './global.css';
import Header from './shared/components/Header';

export const metadata = {
  title: 'Eshopy',
  description: 'Eshopy',
};



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
