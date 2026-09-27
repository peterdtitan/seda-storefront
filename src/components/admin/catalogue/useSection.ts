"use client";

import { useState, useTransition } from "react";

import type { EditorState, Errors } from "@/lib/catalogue/types";
import { summarise } from "@/lib/catalogue/validate";

/**
 * One editable block of the site-copy singleton.
 *
 * Each section keeps its own draft, its own errors and its own save, so switching the
 * announcement bar off does not mean re-saving the story page with it. The shared
 * behaviour is the bit worth factoring out: validate as you type, but stay quiet about
 * it until somebody has actually tried to save.
 */
export function useSection<T>(
  initial: T,
  validate: (input: T) => Errors,
  save: (input: T) => Promise<EditorState>,
) {
  const [input, setInput] = useState(initial);
  const [state, setState] = useState<EditorState>({ status: "idle" });
  const [showErrors, setShowErrors] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  const live = validate(input);
  const errors: Errors = {
    ...(showErrors ? live : {}),
    ...(state.status === "error" ? state.errors : {}),
  };

  function patch(next: Partial<T>) {
    setInput((was) => ({ ...was, ...next }));
    setDirty(true);
    if (state.status === "saved") setState({ status: "idle" });
  }

  function submit() {
    setShowErrors(true);
    if (Object.keys(live).length > 0) {
      setState({ status: "error", message: summarise(live), errors: live });
      return;
    }

    start(async () => {
      const result = await save(input);
      setState(result);
      if (result.status === "saved") {
        setDirty(false);
        setShowErrors(false);
      }
    });
  }

  return { input, patch, setInput, errors, state, pending, dirty, submit };
}
