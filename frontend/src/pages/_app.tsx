import type { AppProps } from 'next/app';
import { SessionProvider } from '@/context/SessionContext';
import '@/styles/globals.css';
import { Inter, Manrope, Fira_Code } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-display',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-mono',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider>
      <div className={`${inter.variable} ${manrope.variable} ${firaCode.variable} font-body`}>
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  );
}
