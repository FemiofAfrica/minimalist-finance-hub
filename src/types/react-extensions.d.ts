import 'react';

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // Add custom data attributes
    'data-lov-id'?: string;
  }
}