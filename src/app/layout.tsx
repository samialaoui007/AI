import type { ReactNode } from 'react';
export const metadata={title:'MCP Media Generator',description:'AI media generation project'};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="ar" dir="rtl"><body style={{margin:0,fontFamily:'system-ui,sans-serif',background:'#0c1020',color:'#f6f7fb'}}>{children}</body></html>}
