import type { Env } from "../env";

const ATLAS_BASE = "https://api.atlascloud.ai/api/v1";
const MODEL = "black-forest-labs/flux-2-pro/text-to-image";
const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 20;

/** House visual language — every cover shares it so the site reads as one publication. */
const STYLE_SUFFIX =
  "Editorial cover illustration for a technology publication. Deep navy (#0b1220) background, " +
  "cyan (#22d3ee) and violet (#8b5cf6) light accents, subtle grain, clean geometric composition, " +
  "sophisticated and minimal, abstract — absolutely no text, no words, no letters, no logos, no UI mockups.";

export function coverPrompt(subject: string) {
  return `${subject}. ${STYLE_SUFFIX}`;
}

async function poll(env: Env, predictionId: string): Promise<string | null> {
  for (let i = 0; i < MAX_POLLS; i++) {
    const res = await fetch(`${ATLAS_BASE}/model/prediction/${predictionId}`, {
      headers: { authorization: `Bearer ${env.ATLAS_CLOUD_API_KEY}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: { status?: string; outputs?: string[]; error?: string };
    };
    const status = body.data?.status;
    if (status === "completed") return body.data?.outputs?.[0] ?? null;
    if (status === "failed" || body.data?.error) {
      console.error("cover generation failed", body.data?.error);
      return null;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return null;
}

/**
 * Generate a cover with Atlas Cloud and mirror it into R2 so the asset lives on
 * our own domain (the provider's CDN URLs are not durable).
 * Returns the public /v1/assets URL, or null on any failure — covers are
 * decorative, so callers must treat this as best-effort.
 */
export async function generateCoverImage(
  env: Env,
  origin: string,
  subject: string,
  slug: string,
): Promise<string | null> {
  if (!env.ATLAS_CLOUD_API_KEY) {
    console.warn("cover generation skipped: ATLAS_CLOUD_API_KEY not set");
    return null;
  }
  try {
    const start = await fetch(`${ATLAS_BASE}/model/generateImage`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.ATLAS_CLOUD_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: coverPrompt(subject),
        width: 1024,
        height: 576,
      }),
    });
    if (!start.ok) {
      console.error("cover start failed", start.status, (await start.text()).slice(0, 200));
      return null;
    }
    const started = (await start.json()) as { data?: { id?: string } };
    const id = started.data?.id;
    if (!id) return null;

    const remoteUrl = await poll(env, id);
    if (!remoteUrl) return null;

    const image = await fetch(remoteUrl);
    if (!image.ok) return null;
    const contentType = image.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const key = `covers/${slug}-${id.slice(0, 8)}.${ext}`;
    await env.ASSETS_BUCKET.put(key, await image.arrayBuffer(), {
      httpMetadata: { contentType },
    });
    return `${origin}/v1/assets/${key}`;
  } catch (error) {
    console.error("cover generation error", error);
    return null;
  }
}
