import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegister } from "./pwa-register";

export const metadata: Metadata = {
  title: "アメくる？ | EmergencyAlert",
  description: "少し先の変化を、今どう動けばいいか分かる形で。",
  applicationName: "EmergencyAlert",
  appleWebApp: {
    capable: true,
    title: "EmergencyAlert",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0 }}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
