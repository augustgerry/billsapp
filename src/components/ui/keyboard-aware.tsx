import {
  createContext,
  useContext,
  type RefObject,
} from 'react';
import type { ScrollView } from 'react-native';

/**
 * Point 9: any form field, when focused, should scroll itself clear of the
 * keyboard. `Screen` owns the ScrollView and publishes `scrollToInput`; a
 * focused `TextField` calls it with its native node tag.
 *
 * Uses ScrollView's built-in `scrollResponderScrollNativeHandleToKeyboard`,
 * the same mechanism `KeyboardAwareScrollView` is built on — no extra deps.
 */
interface KeyboardAwareValue {
  scrollToInput: (nodeTag: number) => void;
}

const KeyboardAwareContext = createContext<KeyboardAwareValue | null>(null);

export function KeyboardAwareProvider({
  scrollRef,
  children,
}: {
  scrollRef: RefObject<ScrollView | null>;
  children: React.ReactNode;
}) {
  const value: KeyboardAwareValue = {
    scrollToInput: (nodeTag) => {
      const responder = scrollRef.current?.getScrollResponder?.();
      // extra 90px so the field clears the keyboard toolbar / done bar
      responder?.scrollResponderScrollNativeHandleToKeyboard?.(nodeTag, 90, true);
    },
  };
  return (
    <KeyboardAwareContext.Provider value={value}>
      {children}
    </KeyboardAwareContext.Provider>
  );
}

export function useKeyboardAware(): KeyboardAwareValue | null {
  return useContext(KeyboardAwareContext);
}
