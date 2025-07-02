import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { GlobalContextProvider } from "./context/globalContext";
import ClientInitializer from "./components/clientInitializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "100 200 300 400 500 600 700 800 900",
});

export const metadata = {
  title: "감자 시뮬레이터",
  description: "자기소개 시뮬레이터",
};

export default function RootLayout({ children }) {

  return (
    <html lang="ko" className={pretendard.className}>
      <body
        className={`${pretendard.className} ${pretendard.className} antialiased`}
      >
        <div className="mx-auto h-dvh sm:aspect-[9/19] max-w-[640px]">
        <GlobalContextProvider>
          <ClientInitializer />
          {children}
        </GlobalContextProvider>
        </div>
      </body>
    </html>
  );
}
