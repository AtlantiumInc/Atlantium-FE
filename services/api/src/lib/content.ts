import type { contentDocuments, profiles } from "../db/schema";

export const MORE_MARKER = "<!--more-->";
const PREVIEW_BLOCK_RATIO = 0.3;

type DocumentRow = typeof contentDocuments.$inferSelect;
type ProfileRow = typeof profiles.$inferSelect;

export type GateResult = {
  body_md: string;
  gated: boolean;
  gate_reason: "signup_required" | null;
};

/** Server-side gate: the full body of a gated document never leaves the worker
 *  for an anonymous caller. Truncation happens on markdown block boundaries. */
export function applyGate(doc: DocumentRow, hasSession: boolean): GateResult {
  if (doc.gate === "public" || hasSession) {
    return { body_md: doc.bodyMd, gated: false, gate_reason: null };
  }
  if (doc.gate === "member") {
    return { body_md: "", gated: true, gate_reason: "signup_required" };
  }
  // preview: cut at the explicit marker, else first ~30% of blocks
  const markerIndex = doc.bodyMd.indexOf(MORE_MARKER);
  if (markerIndex >= 0) {
    return { body_md: doc.bodyMd.slice(0, markerIndex).trimEnd(), gated: true, gate_reason: "signup_required" };
  }
  const blocks = doc.bodyMd.split(/\n{2,}/);
  const keep = Math.max(1, Math.floor(blocks.length * PREVIEW_BLOCK_RATIO));
  return { body_md: blocks.slice(0, keep).join("\n\n").trimEnd(), gated: true, gate_reason: "signup_required" };
}

export function publicAuthor(profile: ProfileRow | null | undefined) {
  if (!profile) return null;
  return {
    profile_id: profile.id,
    display_name: profile.displayName,
    avatar_url: profile.avatarUrl,
  };
}

/** List-level serialization: excerpt fields only, never the body. */
export function publicDocumentSummary(doc: DocumentRow, author?: ProfileRow | null, collectionSlug?: string | null) {
  return {
    id: doc.id,
    type: doc.type,
    format: doc.format,
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.excerpt,
    cover_image_url: doc.coverImageUrl,
    tags: doc.tags,
    collection_slug: collectionSlug ?? null,
    author: publicAuthor(author),
    meta: publicMeta(doc.meta),
    published_at: doc.publishedAt?.toISOString() ?? null,
    updated_at: doc.updatedAt.toISOString(),
  };
}

export function publicDocumentDetail(
  doc: DocumentRow,
  hasSession: boolean,
  author?: ProfileRow | null,
  collectionSlug?: string | null,
) {
  const gate = applyGate(doc, hasSession);
  return {
    ...publicDocumentSummary(doc, author, collectionSlug),
    body_md: gate.body_md,
    gated: gate.gated,
    gate_reason: gate.gate_reason,
  };
}

/** meta is display-only; expose a stable subset so admin scratch keys don't leak. */
function publicMeta(meta: Record<string, unknown>) {
  const { tldr, read_time, sources, guide } = meta as {
    tldr?: unknown; read_time?: unknown; sources?: unknown; guide?: unknown;
  };
  return { tldr, read_time, sources, guide };
}

export function documentJsonLd(doc: DocumentRow, author?: ProfileRow | null, appBase = "https://atlantium.ai") {
  const url = doc.type === "post" ? `${appBase}/blog/${doc.slug}` : `${appBase}/docs/${doc.slug}`;
  const base = {
    "@context": "https://schema.org",
    headline: doc.title,
    description: doc.excerpt ?? undefined,
    url,
    datePublished: doc.publishedAt?.toISOString(),
    dateModified: doc.updatedAt.toISOString(),
    author: author ? { "@type": "Person", name: author.displayName } : undefined,
    publisher: { "@type": "Organization", name: "Atlantium", url: appBase },
    image: doc.coverImageUrl ?? undefined,
  };
  if (doc.format === "guide") {
    return { ...base, "@type": "HowTo", name: doc.title };
  }
  return { ...base, "@type": doc.type === "post" ? "BlogPosting" : "Article" };
}
