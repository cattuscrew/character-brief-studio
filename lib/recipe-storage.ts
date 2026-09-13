"use client";

import JSZip from "jszip";

import {
  recipeImportSchema,
  type CustomOption,
  type RecipeDraft,
  type RecipeReferenceMetadata,
  type RecipeV2,
  type ReferenceAsset,
} from "@/lib/brief-studio";

const DB_NAME = "character-brief-studio";
const DB_VERSION = 2;
const RECIPE_STORE = "recipes";
const ASSET_STORE = "referenceAssets";
const CUSTOM_STORE = "customOptions";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

type StoredAsset = Omit<ReferenceAsset, "blob"> & {
  recipeId: string;
  blob: Blob;
};

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Browser storage request failed."));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Browser storage transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Browser storage transaction was cancelled."));
  });
}

export function openRecipeDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RECIPE_STORE)) {
        database.createObjectStore(RECIPE_STORE, { keyPath: "id" });
      }
        if (!database.objectStoreNames.contains(ASSET_STORE)) {
        const store = database.createObjectStore(ASSET_STORE, { keyPath: "id" });
        store.createIndex("recipeId", "recipeId", { unique: false });
        }
        if (!database.objectStoreNames.contains(CUSTOM_STORE)) {
          const store = database.createObjectStore(CUSTOM_STORE, { keyPath: "id" });
          store.createIndex("fieldId", "fieldId", { unique: false });
        }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open browser storage."));
  });
}

export function validateReferenceFiles(files: File[]) {
  if (files.length > 4) throw new Error("A recipe can contain at most four reference images.");
  let total = 0;
  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) throw new Error(`${file.name} must be a PNG, JPEG, or WebP image.`);
    if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 10 MB.`);
    total += file.size;
  }
  if (total > MAX_TOTAL_BYTES) throw new Error("Reference images cannot exceed 30 MB in total.");
}

export async function listRecipes(): Promise<RecipeV2[]> {
  const database = await openRecipeDatabase();
  const transaction = database.transaction(RECIPE_STORE, "readonly");
    const recipes = await requestResult(transaction.objectStore(RECIPE_STORE).getAll()) as RecipeV2[];
  await transactionDone(transaction);
  database.close();
  return recipes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getRecipe(id: string) {
  const database = await openRecipeDatabase();
  const transaction = database.transaction([RECIPE_STORE, ASSET_STORE], "readonly");
    const recipe = await requestResult(transaction.objectStore(RECIPE_STORE).get(id)) as RecipeV2 | undefined;
  const assets = await requestResult(transaction.objectStore(ASSET_STORE).index("recipeId").getAll(id)) as StoredAsset[];
  await transactionDone(transaction);
  database.close();
  return {
    recipe,
    assets: assets.map(({ recipeId: _recipeId, ...asset }) => asset),
  };
}

export async function saveRecipe(recipe: RecipeV2, draft: RecipeDraft) {
  validateReferenceFiles(draft.references.map((reference) => new File([reference.blob], reference.fileName, { type: reference.mimeType })));
  const database = await openRecipeDatabase();
  const transaction = database.transaction([RECIPE_STORE, ASSET_STORE], "readwrite");
  const recipeStore = transaction.objectStore(RECIPE_STORE);
  const assetStore = transaction.objectStore(ASSET_STORE);
  const priorKeys = await requestResult(assetStore.index("recipeId").getAllKeys(recipe.id));
  priorKeys.forEach((key) => assetStore.delete(key));
  recipeStore.put(recipe);
  draft.references.forEach((reference) => assetStore.put({ ...reference, recipeId: recipe.id } satisfies StoredAsset));
  await transactionDone(transaction);
  database.close();
}

export async function deleteRecipe(id: string) {
  const database = await openRecipeDatabase();
  const transaction = database.transaction([RECIPE_STORE, ASSET_STORE], "readwrite");
  transaction.objectStore(RECIPE_STORE).delete(id);
  const assetStore = transaction.objectStore(ASSET_STORE);
  const keys = await requestResult(assetStore.index("recipeId").getAllKeys(id));
  keys.forEach((key) => assetStore.delete(key));
  await transactionDone(transaction);
  database.close();
}

function safeFileName(fileName: string) {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return cleaned || "reference-image";
}

export async function exportRecipeBundle(recipe: RecipeV2, draft: RecipeDraft) {
  const zip = new JSZip();
  const references: RecipeReferenceMetadata[] = draft.references
    .sort((a, b) => a.order - b.order)
    .map(({ blob: _blob, ...reference }, index) => ({
      ...reference,
      zipPath: `references/${String(index + 1).padStart(2, "0")}-${safeFileName(reference.fileName)}`,
    }));
  zip.file("recipe.json", JSON.stringify({ ...recipe, references }, null, 2));
  references.forEach((reference, index) => {
    zip.file(reference.zipPath!, draft.references.sort((a, b) => a.order - b.order)[index].blob);
  });
  const bundle = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(bundle);
  anchor.download = `${safeFileName(recipe.name.toLowerCase())}.character-brief.zip`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
}

export async function importRecipeBundle(file: File) {
  const zip = await JSZip.loadAsync(file);
  const recipeFile = zip.file("recipe.json");
  if (!recipeFile) throw new Error("This bundle does not contain recipe.json.");
  const raw = JSON.parse(await recipeFile.async("string"));
    const parsed = recipeImportSchema.parse(raw) as RecipeV2;
  if (parsed.references.length > 4) throw new Error("This recipe contains more than four reference images.");

  let total = 0;
  const assets: ReferenceAsset[] = [];
  for (const reference of parsed.references.sort((a, b) => a.order - b.order)) {
    if (!reference.zipPath || reference.zipPath.includes("..") || !reference.zipPath.startsWith("references/")) {
      throw new Error(`Reference path for ${reference.fileName} is invalid.`);
    }
    const entry = zip.file(reference.zipPath);
    if (!entry) throw new Error(`The bundle is missing ${reference.fileName}.`);
    const blob = await entry.async("blob");
    if (!ALLOWED_TYPES.has(reference.mimeType)) throw new Error(`${reference.fileName} has an unsupported image type.`);
    if (blob.size > MAX_FILE_BYTES) throw new Error(`${reference.fileName} is larger than 10 MB.`);
    total += blob.size;
    assets.push({ ...reference, size: blob.size, blob });
  }
  if (total > MAX_TOTAL_BYTES) throw new Error("Reference images exceed the 30 MB bundle limit.");

  const collision = await getRecipe(parsed.id);
  const now = new Date().toISOString();
    const imported: RecipeV2 = {
    ...parsed,
    id: collision.recipe ? crypto.randomUUID() : parsed.id,
    references: assets.map(({ blob: _blob, ...reference }) => reference),
    createdAt: collision.recipe ? now : parsed.createdAt,
    updatedAt: now,
  };
    const draft: RecipeDraft = { selections: imported.selections, custom: imported.custom, exactText: imported.exactText, references: assets.map((asset) => ({ ...asset, id: crypto.randomUUID() })) };
  imported.references = draft.references.map(({ blob: _blob, ...reference }) => reference);
  await saveRecipe(imported, draft);
  return { recipe: imported, draft };
}

export async function listCustomOptions(): Promise<CustomOption[]> {
  const database = await openRecipeDatabase();
  const transaction = database.transaction(CUSTOM_STORE, "readonly");
  const options = await requestResult(transaction.objectStore(CUSTOM_STORE).getAll()) as CustomOption[];
  await transactionDone(transaction);
  database.close();
  return options.sort((a, b) => a.value.localeCompare(b.value));
}

export async function saveCustomOption(option: CustomOption) {
  const database = await openRecipeDatabase();
  const transaction = database.transaction(CUSTOM_STORE, "readwrite");
  transaction.objectStore(CUSTOM_STORE).put(option);
  await transactionDone(transaction);
  database.close();
}

export async function deleteCustomOption(id: string) {
  const database = await openRecipeDatabase();
  const transaction = database.transaction(CUSTOM_STORE, "readwrite");
  transaction.objectStore(CUSTOM_STORE).delete(id);
  await transactionDone(transaction);
  database.close();
}
