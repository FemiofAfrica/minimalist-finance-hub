import type { LinksFunction } from "@remix-run/node";
import stylesheet from "@/index.css?url";

// Export the links function separately to avoid ESLint react-refresh warnings
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  // ... other links
];