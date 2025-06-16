import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { TopOffsetProvider, useTopOffset } from '@/contexts/TopOffsetContext';

function DisplayOffset() {
  const offset = useTopOffset();
  return <span data-testid="offset-value">{offset}</span>;
}

describe('TopOffsetContext', () => {
  it('provides 0 by default and updates when banner visibility changes', async () => {
    // Render component inside provider
    render(
      <TopOffsetProvider>
        <DisplayOffset />
      </TopOffsetProvider>
    );

    // Initially should be 0
    expect(screen.getByTestId('offset-value').textContent).toBe('0');

    // Simulate banner becoming visible: set CSS variable and body class
    document.body.style.setProperty('--banner-offset', '32px');
    document.body.classList.add('banner-visible');

    // Dispatch custom event
    const event = new CustomEvent('banner-visibility-change', { detail: { visible: true } });
    document.dispatchEvent(event);

    // Wait for provider to react
    await waitFor(() => {
      expect(screen.getByTestId('offset-value').textContent).toBe('32');
    });

    // Hide banner again
    document.body.style.setProperty('--banner-offset', '0px');
    document.body.classList.remove('banner-visible');
    const eventHide = new CustomEvent('banner-visibility-change', { detail: { visible: false } });
    document.dispatchEvent(eventHide);

    await waitFor(() => {
      expect(screen.getByTestId('offset-value').textContent).toBe('0');
    });
  });
}); 