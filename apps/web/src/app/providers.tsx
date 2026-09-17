"use client";

import { ThemeProvider } from "next-themes";
import { Provider as ReduxProvider } from "react-redux";
import { Toaster } from "sonner";
import { store } from "@/store";
import { SocketProvider } from "@/lib/socket";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <SocketProvider>
          {children}
          <Toaster richColors position="top-right" theme="dark" />
        </SocketProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}
