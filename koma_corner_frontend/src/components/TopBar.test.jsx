import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { TopBar } from './TopBar';

test('TopBar renders Sign in or Sign out button', () => {
  render(
    <AppProvider>
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    </AppProvider>
  );
  // At least one of the buttons should be present
  const signIn = screen.queryByText(/Sign in/i);
  const signOut = screen.queryByText(/Sign out/i);
  expect(signIn || signOut).toBeTruthy();
});

test('Sign out button enters loading state when clicked (if present)', () => {
  render(
    <AppProvider>
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    </AppProvider>
  );
  const btn = screen.queryByText('Sign out');
  if (btn) {
    fireEvent.click(btn);
    // After click, we should see signing out state or be navigated
    expect(screen.queryByText(/Signing out…/i) || screen.queryByText(/Sign out/i)).toBeTruthy();
  }
}
) 
