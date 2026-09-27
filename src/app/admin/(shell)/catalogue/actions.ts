"use server";

import { revalidatePath } from "next/cache";

import { uploadImage, type UploadResult } from "@/lib/catalogue/images";
import {
  afterCategoryChange,
  afterCopyChange,
  afterLookChange,
  afterProductChange,
} from "@/lib/catalogue/revalidate";
import type {
  AnnouncementInput,
  CategoryInput,
  ContactInput,
  EditorState,
  HomeInput,
  LookInput,
  LookbookInput,
  ProductInput,
  SaveResult,
  ShopInput,
  StoryInput,
} from "@/lib/catalogue/types";
import {
  validateAnnouncement,
  validateCategory,
  validateContact,
  validateHome,
  validateLook,
  validateLookbook,
  validateProduct,
  validateShop,
  validateStory,
  hasErrors,
  summarise,
} from "@/lib/catalogue/validate";
import * as write from "@/lib/catalogue/write";
import { requirePermission } from "@/lib/auth/permissions";

/**
 * Every way the catalogue can be changed from the admin.
 *
 * The forms validate as you type, which is a convenience and nothing more. Each action
 * re-runs the same validators against the payload it actually received, because a
 * server action is a public endpoint and the browser is not a place to enforce rules.
 */

const DENIED: EditorState = {
  status: "error",
  message: "Your account cannot change the catalogue.",
  errors: {},
};

function invalid(errors: Record<string, string>): EditorState {
  return { status: "error", message: summarise(errors), errors };
}

function settled(result: SaveResult): EditorState {
  return result.ok
    ? { status: "saved", message: result.message, id: result.id }
    : {
        status: "error",
        message: result.message,
        errors: result.errors,
        conflict: result.conflict,
      };
}

/* ---------- images ---------- */

export async function upload(formData: FormData): Promise<UploadResult> {
  await requirePermission("catalogue.write");

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "No file arrived." };

  return uploadImage(file);
}

/* ---------- products ---------- */

export async function saveProduct(
  id: string | null,
  rev: string | null,
  input: ProductInput,
): Promise<EditorState> {
  const actor = await requirePermission("catalogue.write");
  if (!actor) return DENIED;

  const errors = validateProduct(input);
  if (hasErrors(errors)) return invalid(errors);

  const result = await write.saveProduct(id, rev, input);
  if (result.ok) {
    afterProductChange(input.slug);
    revalidatePath("/admin/catalogue");
  }
  return settled(result);
}

export async function toggleProduct(
  id: string,
  slug: string,
  active: boolean,
): Promise<EditorState> {
  await requirePermission("catalogue.write");

  const result = await write.setProductActive(id, active);
  if (result.ok) {
    afterProductChange(slug);
    revalidatePath("/admin/catalogue");
  }
  return settled(result);
}

export async function reorderProducts(entries: { id: string; order: number }[]) {
  await requirePermission("catalogue.write");

  await write.setProductOrder(entries);
  afterProductChange();
  revalidatePath("/admin/catalogue");
}

export async function checkProductDelete(id: string, slug: string) {
  await requirePermission("catalogue.write");
  return write.deleteCheck(id, slug);
}

export async function removeProduct(id: string, slug: string): Promise<EditorState> {
  await requirePermission("catalogue.write");

  // Re-checked here rather than trusted from the confirmation screen: the dialog was
  // drawn from a read that is now seconds old, and a look could have picked the
  // garment up in between.
  const check = await write.deleteCheck(id, slug);
  if (check.blockedBy.length) {
    return {
      status: "error",
      errors: {},
      message: `Still used by ${check.blockedBy.map((row) => row.label).join(", ")}. Remove those references first.`,
    };
  }

  const result = await write.deleteProduct(id);
  if (result.ok) {
    afterProductChange(slug);
    revalidatePath("/admin/catalogue");
  }
  return settled(result);
}

/* ---------- looks ---------- */

export async function saveLook(
  id: string | null,
  rev: string | null,
  input: LookInput,
): Promise<EditorState> {
  await requirePermission("catalogue.write");

  const errors = validateLook(input);
  if (hasErrors(errors)) return invalid(errors);

  const result = await write.saveLook(id, rev, input);
  if (result.ok) {
    afterLookChange();
    revalidatePath("/admin/catalogue/looks");
  }
  return settled(result);
}

export async function removeLook(id: string): Promise<EditorState> {
  await requirePermission("catalogue.write");

  const result = await write.deleteLook(id);
  if (result.ok) {
    afterLookChange();
    revalidatePath("/admin/catalogue/looks");
  }
  return settled(result);
}

/* ---------- categories ---------- */

export async function saveCategory(
  id: string | null,
  rev: string | null,
  input: CategoryInput,
): Promise<EditorState> {
  await requirePermission("catalogue.write");

  const errors = validateCategory(input);
  if (hasErrors(errors)) return invalid(errors);

  const result = await write.saveCategory(id, rev, input);
  if (result.ok) {
    afterCategoryChange();
    revalidatePath("/admin/catalogue/categories");
  }
  return settled(result);
}

export async function removeCategory(id: string): Promise<EditorState> {
  await requirePermission("catalogue.write");

  const result = await write.deleteCategory(id);
  if (result.ok) {
    afterCategoryChange();
    revalidatePath("/admin/catalogue/categories");
  }
  return settled(result);
}

/* ---------- site copy ---------- */

export async function saveAnnouncement(input: AnnouncementInput): Promise<EditorState> {
  await requirePermission("catalogue.write");

  const errors = validateAnnouncement(input);
  if (hasErrors(errors)) return invalid(errors);

  const result = await write.saveAnnouncement(input);
  if (result.ok) afterCopyChange();
  return settled(result);
}

export async function saveHome(input: HomeInput): Promise<EditorState> {
  await requirePermission("catalogue.write");

  const errors = validateHome(input);
  if (hasErrors(errors)) return invalid(errors);

  const result = await write.saveHome(input);
  if (result.ok) afterCopyChange();
  return settled(result);
}

export async function saveShop(input: ShopInput): Promise<EditorState> {
  await requirePermission("catalogue.write");

  const errors = validateShop(input);
  if (hasErrors(errors)) return invalid(errors);

  const result = await write.saveShop(input);
  if (result.ok) afterCopyChange();
  return settled(result);
}

export async function saveStory(input: StoryInput): Promise<EditorState> {
  await requirePermission("catalogue.write");

  const errors = validateStory(input);
  if (hasErrors(errors)) return invalid(errors);

  const result = await write.saveStory(input);
  if (result.ok) afterCopyChange();
  return settled(result);
}

export async function saveLookbookCopy(input: LookbookInput): Promise<EditorState> {
  await requirePermission("catalogue.write");

  const errors = validateLookbook(input);
  if (hasErrors(errors)) return invalid(errors);

  const result = await write.saveLookbookCopy(input);
  if (result.ok) afterCopyChange();
  return settled(result);
}

export async function saveContact(input: ContactInput): Promise<EditorState> {
  await requirePermission("catalogue.write");

  const errors = validateContact(input);
  if (hasErrors(errors)) return invalid(errors);

  const result = await write.saveContact(input);
  if (result.ok) afterCopyChange();
  return settled(result);
}
