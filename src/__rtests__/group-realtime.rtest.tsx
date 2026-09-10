/**
 * Regression test for the Realtime "cannot add postgres_changes callbacks
 * after subscribe()" render error (testing-feedback #3, bugs 2 & 3).
 *
 * `supabase.channel(topic)` hands back an *existing* channel when one with the
 * same topic is still registered, and `removeChannel()` settles a tick late —
 * so a quick unmount/remount used to re-`.on()` an already-subscribed channel
 * and throw during render. `freshChannel()` gives each mount a unique topic.
 *
 * Lives here (not under src/app/) — see add-bill.rtest.tsx for why.
 */
import { render, act } from '@testing-library/react-native';
import { Component, type ReactNode } from 'react';

// --- a fake realtime client that mirrors @supabase/realtime-js semantics ---
class FakeChannel {
  subscribed = false;
  removed = false;
  constructor(public topic: string) {}
  on(type: string, _filter: unknown, _cb: unknown) {
    if (this.subscribed && type === 'postgres_changes') {
      throw new Error(
        `cannot add \`${type}\` callbacks for ${this.topic} after \`subscribe()\`.`,
      );
    }
    return this;
  }
  subscribe() {
    this.subscribed = true;
    return this;
  }
}

const registry: FakeChannel[] = []; // live channels (spliced on removeChannel)
const created: FakeChannel[] = []; // every channel ever made (for assertions)
const fakeSupabase = {
  channel(topic: string) {
    const full = `realtime:${topic}`;
    const existing = registry.find((c) => c.topic === full && !c.removed);
    if (existing) return existing;
    const ch = new FakeChannel(full);
    registry.push(ch);
    created.push(ch);
    return ch;
  },
  async removeChannel(ch: FakeChannel) {
    // settles a tick late, exactly like the real async teardown
    await Promise.resolve();
    ch.removed = true;
    const i = registry.indexOf(ch);
    if (i >= 0) registry.splice(i, 1);
  },
};

jest.mock('@/lib/supabase', () => ({ supabase: fakeSupabase }));

// eslint-disable-next-line import/first
import { useGroupRealtime } from '@/features/groups/use-group-realtime';

function Probe() {
  useGroupRealtime('g1', [], () => {});
  return null;
}

let caught: Error | null = null;
class Boundary extends Component<{ children: ReactNode }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    caught = err;
    return { err };
  }
  render() {
    return this.state.err ? null : this.props.children;
  }
}

beforeEach(() => {
  caught = null;
  registry.length = 0;
  created.length = 0;
});

test('unmount + immediate remount does not throw "after subscribe()"', async () => {
  const first = await render(
    <Boundary>
      <Probe />
    </Boundary>,
  );
  await first.unmount(); // kicks off the async removeChannel (settles a tick late)

  // remount before removeChannel has settled — the old failure window
  await render(
    <Boundary>
      <Probe />
    </Boundary>,
  );
  await act(async () => {
    await Promise.resolve();
  });

  expect(caught).toBeNull();
});

test('each mount subscribes on its own channel topic', async () => {
  const a = await render(<Probe />);
  await a.unmount();
  const b = await render(<Probe />);
  await act(async () => {
    await Promise.resolve();
  });
  await b.unmount();

  const topics = created.map((c) => c.topic);
  expect(topics.length).toBeGreaterThanOrEqual(2);
  expect(new Set(topics).size).toBe(topics.length);
  expect(created.every((c) => c.subscribed)).toBe(true);
});
