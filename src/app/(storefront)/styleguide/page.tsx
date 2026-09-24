import type { CSSProperties } from "react";
import { notFound } from "next/navigation";

import { Primitives } from "./Primitives";
import s from "./styleguide.module.css";
import {
  accents,
  coreColours,
  durations,
  easings,
  fontSizes,
  neutrals,
  radii,
  scrims,
  semanticColours,
  shadows,
  spacing,
  typeRoles,
} from "./tokens";

export const metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

/** Custom properties are not in CSSProperties; this keeps the casts in one place. */
type Vars = CSSProperties & Record<`--${string}`, string>;

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={s.section}>
      <div className={s.sectionHead}>
        <span className="seda-disp" style={{ "--disp-size": "var(--fs-xl)" } as Vars}>
          {title}
        </span>
        <span className={s.flex} />
      </div>
      {note ? <p className={s.note}>{note}</p> : null}
      {children}
    </section>
  );
}

function Swatches({ names }: { names: string[] }) {
  return (
    <div className={s.swatchGrid}>
      {names.map((name) => (
        <div key={name} className={s.swatch}>
          <div className={s.swatchChip} style={{ background: `var(${name})` }} />
          <div className={s.swatchMeta}>
            <div className={s.swatchName}>{name}</div>
            <div className={s.swatchValue}>var({name})</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScopePanel({ theme, label }: { theme?: "oxblood" | "ink"; label: string }) {
  return (
    <div className={s.scopePanel} data-theme={theme}>
      <div className="seda-eyebrow">{label}</div>
      <div
        className="seda-disp"
        style={{ "--disp-size": "var(--fs-2xl)", marginTop: "10px" } as Vars}
      >
        Wear Șèdá
      </div>
      <p className="seda-brand-body" style={{ "--brand-body-color": "var(--text-muted)" } as Vars}>
        Every semantic alias flips together. Nothing here is hand-inverted.
      </p>
      <div className={s.scopeActions}>
        <button type="button" className={s.solid}>
          Primary
        </button>
        <button type="button" className={s.outline}>
          Secondary
        </button>
      </div>
    </div>
  );
}

export default function StyleguidePage() {
  // Token ramps are an internal tool and leak the design system's shape. Ship the
  // route in development only; the production build 404s it.
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className={s.page}>
      <h1 className="seda-disp" style={{ "--disp-size": "var(--fs-3xl)" } as Vars}>
        Styleguide
      </h1>
      <p className={`seda-brand-body ${s.lede}`} style={{ "--brand-body-max": "62ch" } as Vars}>
        Every token in src/styles/tokens/, rendered. If a ramp here looks wrong, the token file is
        wrong — not the page that consumes it. Development build only.
      </p>

      <Section
        title="Colour — core"
        note="Two dark grounds, one light ground. At most two grounds in any one document."
      >
        <Swatches names={coreColours} />
      </Section>

      <Section title="Colour — warm neutrals">
        <Swatches names={neutrals} />
      </Section>

      <Section
        title="Colour — Adire accents"
        note="Sampled from the collection's own cloth. These appear through photography and small marks, essentially never as large flat fields."
      >
        <Swatches names={accents} />
      </Section>

      <Section
        title="Colour — semantic aliases"
        note="Always consume these, never the raw --seda-* hex."
      >
        <Swatches names={semanticColours} />
      </Section>

      <Section
        title="Inverse scopes"
        note="data-theme='oxblood' and data-theme='ink' flip the whole semantic set. Use these rather than hand-inverting colours on a dark band."
      >
        <div className={s.scopeRow}>
          <ScopePanel label="default" />
          <ScopePanel theme="oxblood" label="data-theme=oxblood" />
          <ScopePanel theme="ink" label="data-theme=ink" />
        </div>
      </Section>

      <Section
        title="Type — composed roles"
        note="Use the font: shorthand roles directly. Display is Hatton (substituted Bodoni Moda), brand is Kingred Modern (substituted Poiret One), UI is Jost."
      >
        {typeRoles.map((role) => (
          <div key={role} className={s.typeRow}>
            <span className={s.typeKey}>{role}</span>
            <span className={s.typeSpecimen} style={{ font: `var(${role})` }}>
              Contemporary Adire — Șèdá 48,000
            </span>
          </div>
        ))}
      </Section>

      <Section title="Type — recipes" note="The four recurring shapes from the design reference.">
        <div className={s.typeRow}>
          <span className={s.typeKey}>.seda-disp</span>
          <span className="seda-disp" style={{ "--disp-size": "var(--fs-2xl)" } as Vars}>
            New this drop
          </span>
        </div>
        <div className={s.typeRow}>
          <span className={s.typeKey}>.seda-eyebrow</span>
          <span className="seda-eyebrow">Drop 01 · Lagos</span>
        </div>
        <div className={s.typeRow}>
          <span className={s.typeKey}>.seda-brand-body</span>
          <span className="seda-brand-body">
            Every piece is crafted with enough intention that it earns a place in your daily
            routine, not just your wardrobe.
          </span>
        </div>
        <div className={s.typeRow}>
          <span className={s.typeKey}>.seda-ui-label</span>
          <span className="seda-ui-label">Add to bag</span>
        </div>
        <div className={s.typeRow}>
          <span className={s.typeKey}>.seda-tabular</span>
          <span className="seda-tabular" style={{ font: "var(--type-body)" }}>
            ₦48,000 · ₦22,000 · ₦86,000
          </span>
        </div>
      </Section>

      <Section
        title="Primitives"
        note="The shared parts the screens are built from. Swatches and sizes are interactive — click one."
      >
        <Primitives />
      </Section>

      <Section
        title="Glyph coverage"
        note="The brand treats the diacritics in Șèdá as non-negotiable, and the layouts lean on — and · as separators. Any cell below that renders a blank or a tofu box means that face cannot carry the character and the copy must use something it can. Re-check this section the day the licensed Hatton and Kingred Modern files land."
      >
        {(
          [
            ["display", "var(--font-display)"],
            ["brand", "var(--font-brand)"],
            ["ui", "var(--font-ui)"],
          ] as const
        ).map(([label, family]) => (
          <div key={label} className={s.typeRow}>
            <span className={s.typeKey}>{label}</span>
            <span style={{ fontFamily: family, fontSize: "var(--fs-xl)", lineHeight: 1.4 }}>
              Șèdá ȘÈDÁ &mdash; &ndash; &middot; &bull; ₦48,000 &copy; &rsquo;
            </span>
          </div>
        ))}
      </Section>

      <Section title="Type — size ramp">
        {fontSizes.map(([name, value]) => (
          <div key={name} className={s.rampRow}>
            <span className={s.typeKey}>{name}</span>
            <span className={s.typeKey}>{value}</span>
            <span
              className={s.typeSpecimen}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: `var(${name})`,
                lineHeight: 1.1,
              }}
            >
              Șèdá
            </span>
          </div>
        ))}
      </Section>

      <Section title="Spacing" note="4px base; the layout rhythm is 24 / 48 / 96.">
        {spacing.map(([name, value]) => (
          <div key={name} className={s.rampRow}>
            <span className={s.typeKey}>{name}</span>
            <span className={s.typeKey}>{value}</span>
            <span className={s.rampBar} style={{ width: `var(${name})` }} />
          </div>
        ))}
      </Section>

      <Section
        title="Radius"
        note="The brand is squared. Inputs get 3px, filter chips and counters get the pill. Never round an image or a card."
      >
        <div className={s.tileGrid}>
          {radii.map(([name, value]) => (
            <div key={name} className={s.tile} style={{ borderRadius: `var(${name})` }}>
              {name} · {value}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Elevation"
        note="The brand does not float. Shadows exist only where an element genuinely overlaps content."
      >
        <div className={s.tileGrid}>
          {shadows.map((name) => (
            <div key={name} className={s.shadowTile} style={{ boxShadow: `var(${name})` }}>
              {name}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Scrims"
        note="Protection gradients for cream type over photography. Use these, not opacity on the text."
      >
        <div className={s.tileGrid}>
          {scrims.map((name) => (
            <div key={name} className={s.scrimTile}>
              <span className={s.scrimLayer} style={{ background: `var(${name})` }} />
              <span className={s.scrimLabel}>{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Motion"
        note="Cloth, not rubber. Everything eases out; nothing bounces or overshoots. Durations collapse to 1ms under prefers-reduced-motion — check this page with that setting on."
      >
        {durations.map(([name, value]) => (
          <div key={name} className={s.rampRow}>
            <span className={s.typeKey}>{name}</span>
            <span className={s.typeKey}>{value}</span>
            <span className={s.motionTrack}>
              <span
                className={s.motionBar}
                style={
                  {
                    width: "64px",
                    animationDuration: `var(${name})`,
                    animationTimingFunction: "var(--ease-out)",
                  } as Vars
                }
              />
            </span>
          </div>
        ))}
        {easings.map(([name, value]) => (
          <div key={name} className={s.rampRow}>
            <span className={s.typeKey}>{name}</span>
            <span className={s.typeKey} />
            <span className={s.typeKey}>{value}</span>
          </div>
        ))}
      </Section>
    </main>
  );
}
