/**
 * The client photography, keyed the way the design reference keys it. Files live in
 * the handoff bundle, NOT in this repo: the spec is explicit that photography is
 * uploaded to the CMS and only the logos are committed.
 *
 * Override the location with SEDA_ASSETS_DIR if the bundle is not a sibling.
 */

import path from "node:path";

const DEFAULT_ASSETS_DIR = path.join(
  process.cwd(),
  "..",
  "Șèdá Design System",
  "design_handoff_seda_storefront",
  "design_reference",
  "assets",
);

export const assetsDir = process.env.SEDA_ASSETS_DIR ?? DEFAULT_ASSETS_DIR;

export const IMAGES = {
  // Garments
  cargoTeal: "imagery/cargo-teal.png",
  cargoCoral: "imagery/cargo-coral.png",
  cargoIndigo: "imagery/cargo-indigo.png",
  teeIndigo: "imagery/look-tee-indigo.png",
  cowrie: "imagery/look-cowrie-black.png",
  robeSand: "imagery/look-robe-sand.png",
  setIndigo: "imagery/look-set-indigo.png",
  rust: "imagery/look-rust-tiedye.png",
  blueRobe: "imagery/look-blue-robe.png",
  indigoFull: "imagery/look-indigo-full.png",
  // Places and process
  mural: "imagery/look-mural.png",
  street: "imagery/look-street.png",
  studio: "imagery/look-studio.png",
  gallery: "imagery/look-gallery.png",
  sunflower: "imagery/look-sunflower-orange.png",
  splash: "imagery/look-splash-bw.png",
  packaging: "imagery/packaging.png",
  // Cloth
  fabricStack: "imagery/fabric-stack.png",
  fabricFolded: "imagery/fabric-folded-indigo.png",
  fabricMushroom: "imagery/fabric-mushroom.png",
  fabricBlockprint: "imagery/fabric-blockprint-bw.png",
  // Adire texture tiles
  adireMushroom: "textures/adire-mushroom.png",
  adireOchre: "textures/adire-ochre.png",
  adireIndigo: "textures/adire-indigo.png",
} as const;

export type ImageKey = keyof typeof IMAGES;

export function assetPath(key: ImageKey): string {
  return path.join(assetsDir, IMAGES[key]);
}
