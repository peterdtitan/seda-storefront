import type { StructureResolver } from "sanity/structure";

/** Default document list until commit 3 gives the Studio something to organise. */
export const structure: StructureResolver = (S) =>
  S.list().title("Content").items(S.documentTypeListItems());
