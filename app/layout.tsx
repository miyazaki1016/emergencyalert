import type { ReactNode } from "react";

export const metadata = {
  title: "アメくる？ | EmergencyAlert",
  description: "少し先の変化を、今どう動けばいいか分かる形で。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
