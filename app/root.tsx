import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import ErrorBoundaryComponent from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import React from 'react';
import { Analytics } from "@vercel/analytics/remix";
import { SpeedInsights } from "@vercel/speed-insights/remix";

// Import links function from separate file
import { links } from "./links";

// Re-export the links function with allowConstantExport flag
// eslint-disable-next-line react-refresh/only-export-components
export { links };

export default function App() {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider>
          <CurrencyProvider>
            <ErrorBoundaryComponent>
              <Outlet />
              <Toaster />
              <ScrollRestoration />
              <Scripts />
              <Analytics />
              <SpeedInsights />
            </ErrorBoundaryComponent>
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
