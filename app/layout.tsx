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
  themeColor: "#102b4b",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, background: "radial-gradient(circle at top, #2d5f91 0, #183e67 38%, #102b4b 76%)", minHeight: "100vh" }}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
