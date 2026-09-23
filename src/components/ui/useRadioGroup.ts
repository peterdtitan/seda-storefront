"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";

/** Keyboard behaviour for a role="radiogroup" built out of buttons.
 *
 * Declaring the role is a promise that arrow keys work and that the group is a
 * single tab stop, so this supplies both. Selection stays on click/Space/Enter
 * rather than following focus: a sold-out option is still worth arrowing onto to
 * hear that it is sold out, and selecting it is not possible. */
export function useRadioGroup(count: number, activeIndex: number) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const setRef = useCallback(
    (index: number) => (node: HTMLButtonElement | null) => {
      refs.current[index] = node;
    },
    [],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      let next: number;

      if (step) next = (index + step + count) % count;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = count - 1;
      else return;

      event.preventDefault();
      refs.current[next]?.focus();
    },
    [count],
  );

  // One tab stop for the whole group, landing on the selection. With nothing
  // selected the first option takes it so the group is still reachable.
  const tabIndex = (index: number) => (index === (activeIndex >= 0 ? activeIndex : 0) ? 0 : -1);

  return { setRef, onKeyDown, tabIndex };
}
