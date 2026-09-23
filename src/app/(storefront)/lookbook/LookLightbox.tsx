"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { SanityImage } from "@/components/SanityImage";
import { Display } from "@/components/ui/Text";
import { EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { SanityImage as SanityImageValue } from "@/sanity/lib/types";

import s from "./lookbook.module.css";

export type LightboxLook = {
  _id: string;
  slug: string;
  label: string;
  image: SanityImageValue;
};

const LightboxContext = createContext<{ open: (id: string) => void } | null>(null);

export function LookLightbox({
  looks,
  children,
}: {
  looks: LightboxLook[];
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const params = useSearchParams();

  // ?look= makes an open look shareable and survives a refresh, the same way ?colour=
  // works on a product.
  const requested = params.get("look");
  const [openId, setOpenId] = useState<string | null>(
    () => looks.find((look) => look.slug === requested)?._id ?? null,
  );

  const current = looks.find((look) => look._id === openId) ?? null;

  const open = useCallback(
    (id: string) => {
      setOpenId(id);
      const look = looks.find((entry) => entry._id === id);
      if (look) router.replace(`/lookbook?look=${look.slug}`, { scroll: false });
      track(EVENTS.lookOpened, { props: { look: look?.label ?? id } });
    },
    [looks, router],
  );

  const close = useCallback(() => {
    setOpenId(null);
    router.replace("/lookbook", { scroll: false });
  }, [router]);

  // showModal puts the dialog in the top layer and brings the focus trap, background
  // inertness and Escape with it. React cannot express any of that, so the element is
  // driven imperatively.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (current && !dialog.open) dialog.showModal();
    if (!current && dialog.open) dialog.close();
  }, [current]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      close();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [close]);

  useEffect(() => {
    if (!current) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [current]);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <LightboxContext.Provider value={value}>
      {children}

      <dialog
        ref={dialogRef}
        className={s.lightbox}
        aria-label={current?.label}
        onClick={(event) => {
          // A click that lands on the dialog itself is a click on the backdrop; the
          // figure inside covers everything the viewer would mean to hit.
          if (event.target === dialogRef.current) close();
        }}
      >
        {current && (
          <figure className={s.lightboxFigure}>
            <button type="button" className={s.lightboxClose} onClick={close} autoFocus>
              <span aria-hidden="true">×</span>
              <span className="seda-visually-hidden">Close</span>
            </button>

            <div className={s.lightboxImage}>
              <SanityImage
                image={current.image}
                sizes="(max-width: 768px) 100vw, 90vw"
                alt={current.image?.alt || current.label}
              />
            </div>

            <Display as="figcaption" colour="var(--seda-cream)" className={s.lightboxCaption}>
              {current.label}
            </Display>
          </figure>
        )}
      </dialog>
    </LightboxContext.Provider>
  );
}

export function LookTrigger({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  const context = useContext(LightboxContext);

  return (
    <button
      type="button"
      className={s.trigger}
      onClick={() => context?.open(id)}
      aria-label={`View ${label} full size`}
    >
      {children}
    </button>
  );
}
