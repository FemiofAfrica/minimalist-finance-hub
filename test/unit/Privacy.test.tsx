import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Privacy from '@/pages/Privacy';

describe('Privacy Page', () => {
  it('renders the Privacy Policy heading', () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /privacy policy/i })).toBeInTheDocument();
  });
}); 