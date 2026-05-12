/**
 * Orphan-safe FK remap when cloning a workspace.
 * Returns null when the source key is missing or unmapped — preserves intent
 * that a child row pointing at a deleted parent stays orphan in the clone too.
 */
export function mapOptionalForeignKey(
  oldId: string | null | undefined,
  idMap: Map<string, string>,
): string | null {
  if (!oldId) return null;
  return idMap.get(oldId) ?? null;
}
