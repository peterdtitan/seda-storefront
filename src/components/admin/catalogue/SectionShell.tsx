"use client";

import type { EditorState } from "@/lib/catalogue/types";

import s from "./catalogue.module.css";

export function SectionShell({
  title,
  note,
  state,
  pending,
  dirty,
  onSave,
  children,
}: {
  title: string;
  note?: string;
  state: EditorState;
  pending: boolean;
  dirty: boolean;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={s.card}>
      <div className={s.cardHead}>
        <h2 className={s.cardTitle}>{title}</h2>
        {dirty && <span className={s.dirty}>Unsaved</span>}
      </div>
      {note && <p className={s.cardNote}>{note}</p>}

      <div style={{ marginTop: 14 }}>{children}</div>

      <div className={s.actions} style={{ marginTop: 16 }}>
        <button type="button" className={s.primary} disabled={pending} onClick={onSave}>
          {pending ? "Saving…" : "Save"}
        </button>
        {state.status !== "idle" && (
          <p
            className={`${s.status} ${state.status === "error" ? s.bad : s.good}`}
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        )}
      </div>
    </section>
  );
}
