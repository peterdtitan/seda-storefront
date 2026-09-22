import type { SchemaTypeDefinition } from "sanity";

import { category } from "./category";
import { colourway } from "./colourway";
import { look } from "./look";
import { product } from "./product";
import { productImage } from "./productImage";
import { siteCopy } from "./siteCopy";
import { sizeStock } from "./sizeStock";

export const schemaTypes: SchemaTypeDefinition[] = [
  // Documents
  product,
  look,
  category,
  siteCopy,
  // Objects
  colourway,
  sizeStock,
  productImage,
];
