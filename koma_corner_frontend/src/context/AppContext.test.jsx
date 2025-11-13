import { renderHook } from '@testing-library/react';
import { AppProvider, useAppContext } from './AppContext';

test('AppContext provides defaults', () => {
  const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>;
  const { result } = renderHook(() => useAppContext(), { wrapper });
  expect(result.current).toHaveProperty('sessionChecked');
  expect(result.current).toHaveProperty('search');
});
