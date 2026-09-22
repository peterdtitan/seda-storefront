import type { StructureResolver } from "sanity/structure";

/**
 * Site copy is a singleton — one document, fixed id, edited in place. Left to the
 * default document list an editor can create a second one, and the storefront would
 * then pick an arbitrary winner.
 */
export const SITE_COPY_ID = "siteCopy";

const SINGLETONS = new Set(["siteCopy"]);

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Șèdá")
    .items([
      S.listItem()
        .title("Products")
        .schemaType("product")
        .child(S.documentTypeList("product").title("Products")),
      S.listItem()
        .title("Lookbook")
        .schemaType("look")
        .child(S.documentTypeList("look").title("Looks")),
      S.listItem()
        .title("Categories")
        .schemaType("category")
        .child(S.documentTypeList("category").title("Categories")),
      S.divider(),
      S.listItem()
        .title("Site copy")
        .id(SITE_COPY_ID)
        .schemaType("siteCopy")
        .child(S.document().schemaType("siteCopy").documentId(SITE_COPY_ID)),
      ...S.documentTypeListItems().filter((item) => {
        const id = item.getId();
        return id ? !SINGLETONS.has(id) && !["product", "look", "category"].includes(id) : false;
      }),
    ]);
