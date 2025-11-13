import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { Auth } from './Auth';

test('renders Auth buttons (email/password only)', () => {
  render(
    <AppProvider>
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    </AppProvider>
  );
  expect(screen.getByText(/Sign in/i)).toBeInTheDocument();
  expect(screen.getByText(/Create account/i)).toBeInTheDocument();
  // Google SSO removed
  expect(screen.queryByText(/Continue with Google/i)).not.toBeInTheDocument();
});
