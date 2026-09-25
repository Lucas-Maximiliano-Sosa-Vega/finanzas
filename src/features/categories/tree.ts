import type { Tables } from "@/types/database";

export type Category = Pick<Tables<"categories">, "id" | "parent_id" | "name" | "kind" | "bucket" | "target_pct">;

export interface CategoryNode extends Category {
  children: Category[];
}

const byName = (a: Category, b: Category) => a.name.localeCompare(b.name, "es");

/** Agrupa en categorías principales con sus subcategorías, ordenadas por nombre. */
export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const roots = categories.filter((c) => c.parent_id === null).sort(byName);
  return roots.map((root) => ({
    ...root,
    children: categories.filter((c) => c.parent_id === root.id).sort(byName),
  }));
}

/** Nombre completo "Padre › Hija". */
export function categoryLabel(category: Category, byId: ReadonlyMap<string, Category>): string {
  const parent = category.parent_id ? byId.get(category.parent_id) : undefined;
  return parent ? `${parent.name} › ${category.name}` : category.name;
}
