/**
 * Render smoke test for the Add Bill screen.
 *
 * IMPORTANT: render tests live here, NOT next to the screen under `src/app/`.
 * Expo Router's `require.context` bundles every `.tsx` under `src/app/` into the
 * app, so a co-located test file drags `@testing-library/react-native` (and its
 * `require('console')`) into the Metro graph and breaks the bundle.
 */
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';
import { Component, type ReactNode } from 'react';

import { ThemePreferenceProvider } from '@/features/settings/theme-preference';
import { LocaleProvider } from '@/features/settings/locale';
import type { Group } from '@/types/models';

const GROUP: Group = {
  id: 'g1',
  code: 'ABC12',
  name: 'Rumah Kita',
  pin: '123456',
  members: [
    { name: 'Gerry', email: 'g@x.com', status: 'active' },
    { name: 'Kaka', email: 'k@x.com', status: 'active' },
    { name: 'Nina', email: 'n@x.com', status: 'pending' },
  ],
  bills: [],
  monthly: {},
  createdAt: 0,
};

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockInsertBill = jest.fn(async (_id: string, bill: unknown) => ({
  id: 'b1',
  ...(bill as object),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: (...a: unknown[]) => mockReplace(...a),
    push: (...a: unknown[]) => mockPush(...a),
    back: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: 'g1' }),
  Stack: { Screen: () => null },
}));
jest.mock('@/lib/bills-repository', () => ({
  insertBill: (...a: unknown[]) => mockInsertBill(...(a as [string, unknown])),
}));
jest.mock('@/lib/groups-repository', () => ({
  fetchGroup: jest.fn(async () => GROUP),
}));

// eslint-disable-next-line import/first
import AddBillScreen from '@/app/(app)/group/[id]/add-bill';

let caught: Error | null = null;
class Boundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    caught = err;
    return { err };
  }
  render() {
    return this.state.err ? null : this.props.children;
  }
}

function renderScreen() {
  caught = null;
  render(
    <Boundary>
      <ThemePreferenceProvider>
        <LocaleProvider>
          <AddBillScreen />
        </LocaleProvider>
      </ThemePreferenceProvider>
    </Boundary>,
  );
}

const type = (placeholder: string, value: string) =>
  act(async () => {
    fireEvent.changeText(screen.getByPlaceholderText(placeholder), value);
  });
const tap = (label: string) =>
  act(async () => {
    fireEvent.press(screen.getByText(label));
  });

beforeEach(() => {
  mockReplace.mockClear();
  mockPush.mockClear();
  mockInsertBill.mockClear();
});

test('renders the form once the group has loaded, no render error', async () => {
  renderScreen();
  await waitFor(() => screen.getByText('Nama tagihan'));
  expect(caught).toBeNull();
});

test('a single (non-installment) bill can be filled and submitted', async () => {
  renderScreen();
  await waitFor(() => screen.getByText('Nama tagihan'));

  await type('Contoh: Listrik, Internet, Cicilan Motor', 'listrik');
  await tap('Listrik');
  await tap('Gerry');
  await type('1-31', '20');
  await type('Rp.300.000', '300000');
  await tap('Simpan tagihan');

  await waitFor(() => expect(mockInsertBill).toHaveBeenCalled());
  expect(caught).toBeNull();
  expect(mockReplace).toHaveBeenCalled();
  expect(mockInsertBill.mock.calls[0][1]).toMatchObject({
    name: 'Listrik',
    category: 'Listrik',
    type: 'single',
    responsible: 'Gerry',
    estimate: 300000,
    dueDay: 20,
  });
});

test('the installment branch renders without a render error', async () => {
  renderScreen();
  await waitFor(() => screen.getByText('Nama tagihan'));

  await tap('Cicilan');
  await waitFor(() => screen.getByText('Tenor (berapa kali)'));
  expect(caught).toBeNull();
});

test('the split branch renders without a render error', async () => {
  renderScreen();
  await waitFor(() => screen.getByText('Nama tagihan'));

  await tap('Dibagi rata');
  await waitFor(() =>
    screen.getByText('Siapa saja yang ikut menanggung (min. 2)'),
  );
  expect(caught).toBeNull();
});
