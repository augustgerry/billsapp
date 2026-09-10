/**
 * Render tests for the Settings "Delete account" flow (point 15) and the
 * Legal screen (point 16). Lives here, not under src/app/ — see add-bill.rtest.
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Alert } from 'react-native';

import { ThemePreferenceProvider } from '@/features/settings/theme-preference';
import { LocaleProvider } from '@/features/settings/locale';

const mockDeleteAccount = jest.fn(async () => {});
const mockPush = jest.fn();
// eslint-disable-next-line no-var
var mockParams: { doc?: string } = {};

jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a) },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    email: 'g@x.com',
    wa: '+62812345678',
    signOut: jest.fn(),
    deleteAccount: mockDeleteAccount,
  }),
}));

// eslint-disable-next-line import/first
import SettingsScreen from '@/app/(app)/settings';
// eslint-disable-next-line import/first
import LegalScreen from '@/app/(app)/legal';

function renderWithProviders(node: ReactElement) {
  return render(
    <ThemePreferenceProvider>
      <LocaleProvider>{node}</LocaleProvider>
    </ThemePreferenceProvider>,
  );
}

beforeEach(() => {
  mockDeleteAccount.mockClear();
  mockPush.mockClear();
  mockParams = {};
});

test('Settings shows Delete account and confirms before deleting', async () => {
  const spy = jest.spyOn(Alert, 'alert');
  await renderWithProviders(<SettingsScreen />);

  const btn = await screen.findByText('Hapus Akun');
  await act(async () => {
    fireEvent.press(btn);
  });

  // a warning dialog is shown — nothing deleted yet
  expect(spy).toHaveBeenCalled();
  expect(mockDeleteAccount).not.toHaveBeenCalled();

  // invoke the destructive action from the dialog
  const [, , buttons] = spy.mock.calls[0];
  const confirm = (buttons as { text: string; onPress?: () => void }[]).find(
    (b) => b.text === 'Ya, hapus akun saya',
  );
  await act(async () => {
    confirm?.onPress?.();
  });
  await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledTimes(1));

  spy.mockRestore();
});

test('Legal screen renders the privacy doc then the terms doc', async () => {
  const p = await renderWithProviders(<LegalScreen />);
  await waitFor(() => screen.getByText('Kebijakan Privasi'));
  expect(screen.getByText(/1\. Tentang Kongsi/)).toBeTruthy();
  p.unmount();

  mockParams = { doc: 'terms' };
  await renderWithProviders(<LegalScreen />);
  await waitFor(() => screen.getByText('Syarat & Ketentuan'));
  expect(screen.getByText(/Kongsi BUKAN penyedia jasa pembayaran/)).toBeTruthy();
});
