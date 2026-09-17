import "./globals.css";

export const metadata = { title: "MAIX", description: "Maestro AI music studio" };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
