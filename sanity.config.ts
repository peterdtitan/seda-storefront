"use client";

/**
 * Sanity Studio, embedded inside the admin panel at /admin/studio.
 *
 * Route: src/app/admin/(shell)/studio/[[...tool]]/page.tsx
 *
 * Under /admin rather than at its own top-level path so it inherits the panel's
 * session gate and its nav, and so it disappears along with the rest of the admin on
 * the shop's hostname. The basePath has to match the route or Studio's own links
 * point somewhere the middleware will not serve.
 */

import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { apiVersion, dataset, projectId } from "@/sanity/env";
import { schemaTypes } from "@/sanity/schemaTypes";
import { structure } from "@/sanity/structure";

export default defineConfig({
  basePath: "/admin/studio",
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [structureTool({ structure }), visionTool({ defaultApiVersion: apiVersion })],
});
