"use client";

import { useState } from "react";

import { Cta, Outline } from "@/components/ui/Button";
import { Rule } from "@/components/ui/Rule";
import { Scrim } from "@/components/ui/Scrim";
import { Sizes } from "@/components/ui/Sizes";
import { Swatches } from "@/components/ui/Swatches";

import s from "./styleguide.module.css";

const COLOURS = [
  { name: "Teal Adire", slug: "teal-adire", swatch: "#065073" },
  { name: "Coral Adire", slug: "coral-adire", swatch: "#C16B54" },
  { name: "Indigo Adire", slug: "indigo-adire", swatch: "#133656", soldOut: true },
];

const SIZES = [{ size: "S" }, { size: "M" }, { size: "L" }, { size: "XL", soldOut: true }];

export function Primitives() {
  const [colour, setColour] = useState("teal-adire");
  const [size, setSize] = useState("M");

  return (
    <>
      <div className={s.typeRow}>
        <span className={s.typeKey}>Cta</span>
        <span className={s.scopeActions}>
          <Cta>Add to bag</Cta>
          <Cta tone="ink">Checkout</Cta>
          <Cta disabled>Sold out</Cta>
        </span>
      </div>
      <div className={s.typeRow}>
        <span className={s.typeKey}>Outline</span>
        <span className={s.scopeActions}>
          <Outline>Our story</Outline>
          <Outline tone="ink">Lookbook</Outline>
        </span>
      </div>
      <div className={s.typeRow}>
        <span className={s.typeKey}>Cta full</span>
        <span style={{ maxWidth: 320 }}>
          <Cta full>Add to bag</Cta>
        </span>
      </div>
      <div className={s.typeRow}>
        <span className={s.typeKey}>Swatches</span>
        <span>
          <Swatches options={COLOURS} value={colour} onChange={setColour} />
        </span>
      </div>
      <div className={s.typeRow}>
        <span className={s.typeKey}>Sizes</span>
        <span>
          <Sizes options={SIZES} value={size} onChange={setSize} />
        </span>
      </div>
      <div className={s.typeRow}>
        <span className={s.typeKey}>Sizes compact</span>
        <span>
          <Sizes options={SIZES} value={size} onChange={setSize} compact />
        </span>
      </div>
      <div className={s.typeRow}>
        <span className={s.typeKey}>Rule</span>
        <span>
          <Rule />
        </span>
      </div>
      <div className={s.typeRow}>
        <span className={s.typeKey}>Scrim</span>
        <span className={s.scrimRow}>
          {(["bottom", "left", "full"] as const).map((dir) => (
            <span key={dir} className={s.scrimTile}>
              <Scrim dir={dir} />
              <span className={s.scrimLabel}>{dir}</span>
            </span>
          ))}
        </span>
      </div>
    </>
  );
}
