export type TriageTier = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * A TriageCatalog is a structured collection of items
 * organized into discrete priority tiers.
 *
 * - `TTier` = the allowed priority labels (e.g. 'P0' | 'P1' | 'P2' | 'P3')
 * - `TItem` = the type of each catalog entry (e.g. Question)
 *
 * Each tier key holds an **ordered list** of items
 * that share the same level of urgency, leverage, or essentiality.
 *
 * This type is typically the **output** of a <triage> operation
 * applied to a raw catalog, where the catalog is partitioned
 * into meaningful priority groupings.
 */
export type TriageCatalog<TItem, TTier extends string = TriageTier> = {
  readonly [K in TTier]: readonly TItem[];
};
