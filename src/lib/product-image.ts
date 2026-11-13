export type ProductMediaLike = {
  media_url: string;
  media_type?: string | null;
  is_primary?: boolean | null;
  alt_text?: string | null;
};

/**
 * Best photo for one variant of a product.
 *
 * Prefers a photo whose file name or alt text mentions the variant's colour as
 * a whole word (so "Tan" shows the tan pair, and "tan" never matches
 * "standard"), then the primary photo, then the first one. Videos are skipped.
 */
export function variantImage(
  media: ProductMediaLike[] | null | undefined,
  color?: string | null,
): string | null {
  const photos = (media ?? []).filter(
    (m) => m?.media_url && String(m.media_type ?? "IMAGE").toUpperCase() !== "VIDEO",
  );
  if (photos.length === 0) return null;
  const c = String(color ?? "").trim().toLowerCase();
  if (c) {
    const word = new RegExp(`(^|[^a-z])${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`);
    const byColor = photos.find((m) => word.test(`${m.media_url} ${m.alt_text ?? ""}`.toLowerCase()));
    if (byColor) return byColor.media_url;
  }
  return (photos.find((m) => m.is_primary) ?? photos[0]).media_url;
}
