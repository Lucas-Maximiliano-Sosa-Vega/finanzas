import { CornerDownRightIcon, PencilIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CategoryFormDialog } from "@/features/categories/components/category-form";
import { buildCategoryTree, type Category, type CategoryNode } from "@/features/categories/tree";
import { getProfile } from "@/features/settings/queries";
import { getCatalog } from "@/features/shared/queries";
import { BUCKETS, BUCKET_META, type Bucket } from "@/lib/finance/rule";
import { formatPercent } from "@/lib/format";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriesPage() {
  const [{ categories }, profile] = await Promise.all([getCatalog(), getProfile()]);
  const expenseTree = buildCategoryTree(categories.filter((c) => c.kind === "expense"));
  const incomeTree = buildCategoryTree(categories.filter((c) => c.kind === "income"));
  const targets: Record<Bucket, number> = {
    needs: profile.needs_pct,
    wants: profile.wants_pct,
    savings: profile.savings_pct,
  };

  return (
    <div className="space-y-10">
      <PageHeader title="Categorías" description="Para saber en qué se va tu dinero y de dónde viene.">
        <CategoryFormDialog
          categories={categories}
          trigger={
            <Button size="lg" className="h-12 px-5 text-base">
              <PlusIcon className="size-5" />
              Nueva categoría
            </Button>
          }
        />
      </PageHeader>

      <section className="space-y-4" aria-labelledby="expenses-heading">
        <h2 id="expenses-heading" className="text-2xl font-semibold tracking-tight">
          Gastos
        </h2>
        <div className="grid gap-5 xl:grid-cols-3">
          {BUCKETS.map((bucket) => (
            <CategoryGroup
              key={bucket}
              title={BUCKET_META[bucket].label}
              subtitle={`${formatPercent(targets[bucket])} de lo que cobras · ${BUCKET_META[bucket].hint}`}
              color={`var(--${bucket})`}
              nodes={expenseTree.filter((n) => n.bucket === bucket)}
              categories={categories}
              defaults={{ kind: "expense", bucket }}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="income-heading">
        <h2 id="income-heading" className="text-2xl font-semibold tracking-tight">
          Ingresos
        </h2>
        <CategoryGroup
          title="De dónde entra el dinero"
          subtitle="Sueldo, trabajos extra, ventas…"
          color="var(--success)"
          nodes={incomeTree}
          categories={categories}
          defaults={{ kind: "income" }}
          className="xl:max-w-md"
        />
      </section>
    </div>
  );
}

interface CategoryGroupProps {
  title: string;
  subtitle: string;
  color: string;
  nodes: CategoryNode[];
  categories: Category[];
  defaults: { kind: "income" | "expense"; bucket?: Bucket };
  className?: string;
}

function CategoryGroup({ title, subtitle, color, nodes, categories, defaults, className }: CategoryGroupProps) {
  return (
    <article className={`flex flex-col gap-4 rounded-2xl border bg-card p-5 ${className ?? ""}`}>
      <header className="space-y-1 border-l-4 pl-3" style={{ borderColor: color }}>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </header>

      {nodes.length === 0 ? (
        <p className="text-base text-muted-foreground">Todavía no hay categorías aquí.</p>
      ) : (
        <ul className="divide-y">
          {nodes.map((node) => (
            <li key={node.id} className="py-2">
              <CategoryRow category={node} categories={categories} canAddChild />
              {node.children.length > 0 && (
                <ul className="mt-1 space-y-1 pl-4">
                  {node.children.map((child) => (
                    <li key={child.id}>
                      <CategoryRow category={child} categories={categories} isChild />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <CategoryFormDialog
        categories={categories}
        defaults={defaults}
        trigger={
          <Button variant="outline" className="mt-auto h-11 w-full border-dashed text-base text-primary hover:text-primary">
            <PlusIcon className="size-5" />
            Añadir categoría aquí
          </Button>
        }
      />
    </article>
  );
}

function CategoryRow({
  category,
  categories,
  canAddChild = false,
  isChild = false,
}: {
  category: Category;
  categories: Category[];
  canAddChild?: boolean;
  isChild?: boolean;
}) {
  const differentBucket =
    isChild && category.bucket && categories.find((c) => c.id === category.parent_id)?.bucket !== category.bucket;

  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isChild && <CornerDownRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
        <div className="min-w-0">
          <p className={isChild ? "truncate text-base" : "truncate text-base font-semibold"}>{category.name}</p>
          {(category.target_pct !== null || differentBucket) && (
            <p className="text-sm text-muted-foreground">
              {category.target_pct !== null && `Límite: ${formatPercent(category.target_pct)} de lo que cobras`}
              {category.target_pct !== null && differentBucket && " · "}
              {differentBucket && category.bucket && `Cuenta como ${BUCKET_META[category.bucket].label.toLowerCase()}`}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {canAddChild && (
          <CategoryFormDialog
            categories={categories}
            defaults={{ kind: category.kind, bucket: category.bucket ?? undefined, parentId: category.id }}
            trigger={
              <Button variant="ghost" className="h-10 px-3 text-sm text-primary hover:bg-info-soft hover:text-primary">
                <PlusIcon />
                Subcategoría
              </Button>
            }
          />
        )}
        <CategoryFormDialog
          categories={categories}
          category={category}
          trigger={
            <Button variant="outline" className="h-10 px-3 text-sm">
              <PencilIcon />
              Editar
            </Button>
          }
        />
      </div>
    </div>
  );
}
