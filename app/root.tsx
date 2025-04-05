import { useEffect } from 'react';
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import ErrorBoundaryComponent from "@/components/ErrorBoundary";
import stylesheet from "@/styles/tailwind.css";
import { Toaster } from "@/components/ui/toaster";
import { injectSpeedInsights } from '@vercel/speed-insights';
import React from 'react';

export const links = () => [
  { rel: "stylesheet", href: stylesheet },
  // ... other links
];

export default function App() {
  useEffect(() => {
    injectSpeedInsights();
  }, []);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <CurrencyProvider>
              <ErrorBoundaryComponent>
                <Outlet />
                <Toaster />
                <ScrollRestoration />
                <Scripts />
                <LiveReload />
              </ErrorBoundaryComponent>
            </CurrencyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
