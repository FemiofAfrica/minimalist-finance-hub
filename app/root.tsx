import type { LinksFunction } from "@remix-run/node";
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
import stylesheet from "@/index.css?url";
import { Toaster } from "@/components/ui/toaster";
import React from 'react';
import { Analytics } from "@vercel/analytics/remix";
import { SpeedInsights } from "@vercel/speed-insights/remix";

// eslint-disable-next-line react-refresh/only-export-components
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  // ... other links
];

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
