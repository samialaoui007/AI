import './globals.css';
export const metadata={title:'MCP Media Generator',description:'لوحة عربية لتوليد الصور والفيديو ودمج المقاطع عبر MCP'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl"><body>{children}</body></html>}
