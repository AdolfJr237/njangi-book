import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Web-only document shell. This runs while Expo generates the static PWA,
// not in the browser, so browser APIs must not be used here.
export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>NjangiBook</title>
        <meta
          name="description"
          content="A clear, shared record for your njangi group."
        />
        <meta name="theme-color" content="#16244C" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NjangiBook" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
