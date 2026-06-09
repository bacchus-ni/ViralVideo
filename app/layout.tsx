import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "纯文混剪",
  description: "用 AI 生成纯文本混剪视频的极简创作台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
