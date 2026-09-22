/**
 * ȘÈDÁ — font registration. THE ONLY FILE THAT NAMES A CONCRETE TYPEFACE.
 *
 * The brand's real faces are Hatton (display) and Kingred Modern (brand). Both are
 * Canva-licensed and the client has not supplied web binaries, so Bodoni Moda and
 * Poiret One stand in. Jost is real and is not a substitution — it was added
 * deliberately because the brand faces ship one weight and no tabular figures, and
 * prices, labels and inputs need both.
 *
 * WHEN THE REAL FILES ARRIVE: drop the .woff2 into src/app/fonts/, swap the
 * next/font/google call below for next/font/local, and keep the same `variable`
 * name. Nothing outside this file changes — src/styles/tokens/typography.css
 * consumes --font-display-face / --font-brand-face / --font-ui-face and never a
 * family name.
 */

import { Bodoni_Moda, Jost, Poiret_One } from "next/font/google";

/** Display — Hatton. Caps, wide tracking, hairline contrast. */
const displayFace = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
  // Bodoni Moda is optical-size variable; the storefront sets display sizes from
  // 15px captions to a 104px hero, so let the axis track the rendered size.
  axes: ["opsz"],
});

/** Brand — Kingred Modern. Deco geometric, one weight. */
const brandFace = Poiret_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-brand-face",
  display: "swap",
});

/**
 * UI — Jost. Latin-ext is required: the wordmark and body copy carry Ș, è and á,
 * and the brand treats the diacritics as non-negotiable.
 */
const uiFace = Jost({
  subsets: ["latin", "latin-ext"],
  variable: "--font-ui-face",
  display: "swap",
});

/** Applied to <html> so all three stacks resolve for the whole document. */
export const fontVariables = [displayFace.variable, brandFace.variable, uiFace.variable].join(" ");
