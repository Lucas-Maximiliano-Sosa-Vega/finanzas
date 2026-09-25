import { SelectGroup, SelectItem, SelectLabel } from "@/components/ui/select";
import { BUCKETS, BUCKET_META } from "@/lib/finance/rule";
import type { Enums } from "@/types/database";

import { buildCategoryTree, type Category } from "../tree";

/** Opciones de <Select> con categorías agrupadas por bloque y subcategorías sangradas. */
export function CategoryOptions({
  categories,
  kind,
}: {
  categories: Category[];
  kind: Enums<"transaction_kind">;
}) {
  const tree = buildCategoryTree(categories.filter((c) => c.kind === kind));

  const renderNodes = (nodes: typeof tree) =>
    nodes.flatMap((node) => [
      <SelectItem key={node.id} value={node.id} className="h-10 text-base">
        {node.name}
      </SelectItem>,
      ...node.children.map((child) => (
        <SelectItem key={child.id} value={child.id} className="h-10 pl-6 text-base">
          <span className="text-muted-foreground">↳</span> {child.name}
        </SelectItem>
      )),
    ]);

  if (kind === "income") {
    return <SelectGroup>{renderNodes(tree)}</SelectGroup>;
  }

  return BUCKETS.map((bucket) => {
    const nodes = tree.filter((node) => node.bucket === bucket);
    if (nodes.length === 0) return null;
    return (
      <SelectGroup key={bucket}>
        <SelectLabel className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: `var(--${bucket})` }} aria-hidden />
          {BUCKET_META[bucket].label}
        </SelectLabel>
        {renderNodes(nodes)}
      </SelectGroup>
    );
  });
}
