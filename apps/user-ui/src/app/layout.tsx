import './global.css';
import Header from '../shared/components/header/Header';
import { Poppins, Roboto } from 'next/font/google';

export const metadata = {
  title: 'Eshopy',
  description: 'Eshopy',
};

const roboto = Roboto({
  weight: ["100", "300", "400", "500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

const poppins = Poppins({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-poppins",
});
 


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} ${poppins.variable}`} >
        <Header />
        {children}
      </body>
    </html>
  );
}
