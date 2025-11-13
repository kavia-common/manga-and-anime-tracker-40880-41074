import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { Auth } from './Auth';

test('renders Auth buttons', () => {
  render(
    <AppProvider>
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    </AppProvider>
  );
  expect(screen.getByText(/Sign in/i)).toBeInTheDocument();
  expect(screen.getByText(/Create account/i)).toBeInTheDocument();
  expect(screen.getByText(/Continue with Google/i)).toBeInTheDocument();
});
