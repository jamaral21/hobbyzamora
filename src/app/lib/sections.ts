import { ProductSectionGroup } from './api';
import { PRODUCT_CATEGORY_OPTIONS } from './sku';

const SECTION_ORDER = new Map(PRODUCT_CATEGORY_OPTIONS.map((value, index) => [value, index]));

export function slugifySection(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildSectionGroups(groups: ProductSectionGroup[] | null | undefined): ProductSectionGroup[] {
  const byParent = new Map<string, ProductSectionGroup>();

  for (const parent of PRODUCT_CATEGORY_OPTIONS) {
    byParent.set(parent, {
      parentCategory: parent,
      slug: slugifySection(parent),
      children: [],
    });
  }

  for (const group of groups || []) {
    const parent = group.parentCategory;
    const existing = byParent.get(parent) || {
      parentCategory: parent,
      slug: slugifySection(parent),
      children: [],
    };

    const dedupChildren = new Map<string, { id: string; name: string; slug: string }>();
    for (const child of existing.children) dedupChildren.set(child.name, child);
    for (const child of group.children || []) dedupChildren.set(child.name, child);

    byParent.set(parent, {
      ...existing,
      slug: group.slug || existing.slug,
      children: Array.from(dedupChildren.values()).sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
    });
  }

  return Array.from(byParent.values()).sort((a, b) => compareSectionLabels(a.parentCategory, b.parentCategory));
}

export function compareSectionLabels(a: string, b: string) {
  const orderA = SECTION_ORDER.get(a);
  const orderB = SECTION_ORDER.get(b);

  if (orderA != null && orderB != null) return orderA - orderB;
  if (orderA != null) return -1;
  if (orderB != null) return 1;

  return a.localeCompare(b, 'es', { sensitivity: 'base' });
}

export function orderSectionLabels(values: Iterable<string>) {
  return Array.from(new Set(values)).sort(compareSectionLabels);
}

export function resolveParentCategory(category: string, groups: ProductSectionGroup[]) {
  const raw = String(category || '').trim();
  if (!raw) return '';

  for (const group of groups) {
    if (group.parentCategory === raw) return group.parentCategory;
    if (slugifySection(group.parentCategory) === slugifySection(raw)) return group.parentCategory;

    for (const child of group.children) {
      if (child.name === raw || child.slug === slugifySection(raw)) {
        return group.parentCategory;
      }
    }
  }

  return raw;
}

export function matchesCategoryFilter(category: string, filterSlug: string, groups: ProductSectionGroup[]) {
  if (!filterSlug || filterSlug === 'all') return true;

  const normalizedFilter = slugifySection(filterSlug);
  const raw = String(category || '').trim();

  for (const group of groups) {
    const parentSlug = slugifySection(group.parentCategory);
    if (parentSlug === normalizedFilter) {
      if (group.parentCategory === raw) return true;
      if (group.children.some((child) => child.name === raw)) return true;
    }

    if (group.children.some((child) => child.slug === normalizedFilter && child.name === raw)) {
      return true;
    }
  }

  const rawSlug = slugifySection(raw);
  if (rawSlug === normalizedFilter) return true;

  // Backward compatibility for old URLs such as ?category=tomica.
  return rawSlug.includes(normalizedFilter) || normalizedFilter.includes(rawSlug);
}
