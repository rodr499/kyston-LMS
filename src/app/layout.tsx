import type { Metadata } from "next";
import "./globals.css";
import NavigationProgress from "@/components/ui/NavigationProgress";

export const metadata: Metadata = {
  title: "Kyston LMS",
  description: "The LMS your congregation deserves.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="kyston">
      <body className="font-body antialiased text-[#374151] bg-[#f8f9fa]">
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}