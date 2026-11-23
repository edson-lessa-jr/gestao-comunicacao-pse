import type { Metadata } from "next";
import "./globals.css";

const title="Gestão de Comunicados";
const description="Comunicados oficiais, numerados e prontos para divulgar.";
export const metadata:Metadata={title,description,icons:{icon:"/pse-logo.png",shortcut:"/pse-logo.png",apple:"/pse-logo.png"},openGraph:{title,description,type:"website"},twitter:{card:"summary",title,description}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="pt-BR"><body>{children}</body></html>}
