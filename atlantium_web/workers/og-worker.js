/**
 * Consolidated Cloudflare Worker for Dynamic OG Meta Tags
 *
 * Handles all routes that need OG injection:
 *   /u/:username       — User profiles (dynamic, fetched from Xano)
 *   /index/:slug       — Articles (dynamic, fetched from Xano)
 *   /groups/:slug      — Groups (dynamic, fetched from Xano)
 *   /focus-groups      — Focus groups landing (static)
 */

import { ImageResponse } from 'workers-og';

const XANO_API_BASE = 'https://cloud.atlantium.ai/api:-ulnKZsX';
const APP_API_BASE = 'https://cloud.atlantium.ai/api:_c66cUCc';
const ATLANTIUM_API_BASE = 'https://api.atlantium.ai/v1';
const SITE_ORIGIN = 'https://atlantium.ai';

const BOT_USER_AGENTS =
  /facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|Pinterest|Googlebot/i;

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const { pathname } = url;

    // Match routes
    let match;

    if ((match = pathname.match(/^\/u\/([^/]+)\/?$/))) {
      return handleOgRoute(request, () => fetchProfileOg(match[1]));
    }

    if ((match = pathname.match(/^\/index\/([^/]+)\/?$/))) {
      return handleOgRoute(request, () => fetchArticleOg(match[1]));
    }

    if ((match = pathname.match(/^\/groups\/([^/]+)\/?$/))) {
      return handleOgRoute(request, () => fetchGroupOg(match[1]));
    }

    if (pathname === '/focus-groups' || pathname === '/focus-groups/') {
      return handleOgRoute(request, () => staticFocusGroupsOg());
    }

    if ((match = pathname.match(/^\/jobs\/([^/]+)\/?$/))) {
      return handleOgRoute(request, () => fetchJobOg(match[1]));
    }

    if ((match = pathname.match(/^\/og\/jobs\/([^/]+?)(?:\.png)?\/?$/))) {
      return renderJobOgImage(match[1], request);
    }

    // All other requests — pass through
    return fetch(request);
  },
};

// ---------------------------------------------------------------------------
// Shared handler — bot detection, fetch origin, inject tags
// ---------------------------------------------------------------------------

async function handleOgRoute(request, getOgTags) {
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = BOT_USER_AGENTS.test(userAgent);

  const originalResponse = await fetch(request);

  const contentType = originalResponse.headers.get('content-type') || '';
  if (!isBot || !contentType.includes('text/html')) {
    return originalResponse;
  }

  let html = await originalResponse.text();

  try {
    const ogTags = await getOgTags();
    if (ogTags) {
      html = injectOgTags(html, ogTags);
    }
  } catch (error) {
    console.error('OG tag injection error:', error);
  }

  return new Response(html, {
    status: originalResponse.status,
    headers: {
      ...Object.fromEntries(originalResponse.headers),
      'content-type': 'text/html;charset=UTF-8',
    },
  });
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function fetchProfileOg(username) {
  const res = await fetch(
    `${XANO_API_BASE}/profile?username=${encodeURIComponent(username)}`
  );
  if (!res.ok) return null;

  const { profile, og } = await res.json();
  if (!profile || !og) return null;

  return buildOgString({
    type: og.type,
    siteName: og.site_name,
    title: og.title,
    description: og.description,
    image: og.image,
    url: og.url,
    twitterCard: 'summary',
  });
}

async function fetchArticleOg(slug) {
  const res = await fetch(
    `${XANO_API_BASE}/article?slug=${encodeURIComponent(slug)}`
  );
  if (!res.ok) return null;

  const { article, og } = await res.json();
  if (!article || !og) return null;

  const publishedTime = og.published_time
    ? new Date(og.published_time).toISOString()
    : '';

  const tagMetas = (og.tags || [])
    .map((t) => `<meta property="article:tag" content="${escapeHtml(t)}" />`)
    .join('\n    ');

  return buildOgString({
    type: og.type,
    siteName: og.site_name,
    title: og.title,
    description: og.description,
    image: og.image,
    url: og.url,
    twitterCard: 'summary_large_image',
    extra: `
    <meta property="article:author" content="${escapeHtml(og.author)}" />
    <meta property="article:published_time" content="${escapeHtml(publishedTime)}" />
    ${tagMetas}`,
  });
}

async function fetchGroupOg(slug) {
  const res = await fetch(
    `${XANO_API_BASE}/group?slug=${encodeURIComponent(slug)}`
  );
  if (!res.ok) return null;

  const { group, og } = await res.json();
  if (!group || !og) return null;

  return buildOgString({
    type: og.type,
    siteName: og.site_name,
    title: og.title,
    description: og.description,
    image: og.image,
    imageWidth: '1200',
    imageHeight: '630',
    url: og.url,
    twitterCard: 'summary_large_image',
  });
}

async function fetchJobOg(slug) {
  // Job postings live on the Neon-backed api worker (Xano og endpoint is dead).
  const res = await fetch(
    `${ATLANTIUM_API_BASE}/job_postings/${encodeURIComponent(slug)}`
  );
  if (!res.ok) return null;

  const job = await res.json();
  if (!job || !job.title) return null;

  const salary =
    job.salary_min && job.salary_max
      ? `$${Math.round(job.salary_min / 1000)}k–$${Math.round(job.salary_max / 1000)}k`
      : null;
  const parts = [
    job.workplace_type,
    job.location,
    salary,
    job.content && job.content.requirements_summary,
  ].filter(Boolean);
  const description = parts.join(' · ').slice(0, 250) ||
    `${job.title} at ${job.company} — AI & tech jobs in Atlanta on Atlantium.`;

  return buildOgString({
    type: 'website',
    siteName: 'Atlantium',
    title: `${job.title} at ${job.company} — Atlanta Tech Jobs`,
    description,
    // Version in the URL: unfurl caches key on the image URL, so bumping
    // OG_RENDER_VERSION makes platforms fetch the new render.
    image: `${SITE_ORIGIN}/og/jobs/${encodeURIComponent(slug)}.png?v=${OG_RENDER_VERSION}`,
    imageWidth: '1200',
    imageHeight: '630',
    url: `${SITE_ORIGIN}/jobs/${encodeURIComponent(slug)}`,
    twitterCard: 'summary_large_image',
  });
}

// ---------------------------------------------------------------------------
// Per-job OG image (1200x630 PNG rendered with satori/resvg via workers-og)
// ---------------------------------------------------------------------------

const OG_RENDER_VERSION = '3';

const FONT_URLS = {
  regular: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf',
  semibold: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.ttf',
  extrabold: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-800-normal.ttf',
};

async function loadFont(url) {
  const req = new Request(url, { cf: { cacheTtl: 604800, cacheEverything: true } });
  const res = await fetch(req);
  if (!res.ok) throw new Error(`font fetch failed: ${url}`);
  return res.arrayBuffer();
}

function formatSalaryRange(min, max) {
  const fmt = (n) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

async function renderJobOgImage(slug, request) {
  // Serve from the edge cache when we can.
  const cache = caches.default;
  const cacheUrl = new URL(request.url);
  cacheUrl.searchParams.set('v', OG_RENDER_VERSION);
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const res = await fetch(
    `${ATLANTIUM_API_BASE}/job_postings/${encodeURIComponent(slug)}`
  );
  if (!res.ok) return Response.redirect(`${SITE_ORIGIN}/og-image.png`, 302);
  const job = await res.json();
  if (!job || !job.title) return Response.redirect(`${SITE_ORIGIN}/og-image.png`, 302);

  const newDate = job.posted_at || job.created_at;
  const newAge = newDate ? Date.now() - new Date(newDate).getTime() : -1;
  const isNewThisWeek = newAge >= 0 && newAge < 7 * 24 * 60 * 60 * 1000;

  const salary = formatSalaryRange(job.salary_min, job.salary_max);
  const stack = ((job.content && job.content.tech_stack) || []).slice(0, 6);
  let location = (job.location || 'Atlanta, GA').split(',').slice(0, 2).join(',');
  if (location.length > 30) location = `${location.slice(0, 28)}\u2026`;

  const badge = (label, color, bg, border) => `
    <div style="display: flex; align-items: center; margin-right: 14px; padding: 6px 16px; border-radius: 999px; font-size: 22px; font-weight: 600; color: ${color}; background: ${bg}; border: 1px solid ${border};">${escapeHtml(label)}</div>`;

  const badges = [
    isNewThisWeek ? badge('New this week', '#22d3ee', 'rgba(6,182,212,0.15)', 'rgba(34,211,238,0.5)') : '',
    job.workplace_type ? badge(job.workplace_type, '#34d399', 'rgba(16,185,129,0.12)', 'rgba(16,185,129,0.4)') : '',
    job.seniority ? badge(job.seniority, '#a5b4fc', 'rgba(99,102,241,0.12)', 'rgba(99,102,241,0.4)') : '',
    salary ? badge(salary, '#6ee7b7', 'rgba(16,185,129,0.08)', 'rgba(16,185,129,0.3)') : '',
  ].filter(Boolean).join('');

  const chips = stack
    .map(
      (t) => `
    <div style="display: flex; margin-right: 10px; margin-bottom: 10px; padding: 5px 14px; border-radius: 8px; font-size: 20px; font-weight: 400; color: #67e8f9; background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.25);">${escapeHtml(t)}</div>`
    )
    .join('');

  const title = job.title.length > 70 ? `${job.title.slice(0, 67)}…` : job.title;

  const html = `
  <div style="display: flex; flex-direction: column; width: 1200px; height: 630px; background: linear-gradient(135deg, #04070d 0%, #071120 55%, #0a1a2e 100%); padding: 56px 64px; font-family: 'Inter'; position: relative;">
    <div style="display: flex; position: absolute; top: -180px; right: -140px; width: 520px; height: 520px; border-radius: 999px; background: rgba(14,165,233,0.14);"></div>
    <div style="display: flex; position: absolute; bottom: -220px; left: -160px; width: 480px; height: 480px; border-radius: 999px; background: rgba(99,102,241,0.10);"></div>

    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; flex-shrink: 0;">
        <div style="display: flex; font-size: 34px; font-weight: 800; color: #ffffff; letter-spacing: 2px;">ATLANTIUM</div>
        <div style="display: flex; flex-shrink: 0; white-space: nowrap; margin-left: 18px; padding: 6px 14px; border-radius: 999px; font-size: 20px; font-weight: 600; color: #22d3ee; background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.35); letter-spacing: 1px;">ATLANTA TECH JOBS</div>
      </div>
      <div style="display: flex; margin-left: 24px; font-size: 22px; color: #64748b;">${escapeHtml(location)}</div>
    </div>

    <div style="display: flex; flex-direction: column; margin-top: 64px; flex-grow: 1;">
      <div style="display: flex; font-size: ${title.length > 40 ? 54 : 64}px; font-weight: 800; color: #f8fafc; line-height: 1.15; max-width: 1050px;">${escapeHtml(title)}</div>
      <div style="display: flex; margin-top: 20px; font-size: 32px; font-weight: 600; color: #7dd3fc;">${escapeHtml(job.company || '')}</div>
      <div style="display: flex; margin-top: 28px;">${badges}</div>
    </div>

    <div style="display: flex; flex-direction: column;">
      ${chips ? `<div style="display: flex; flex-wrap: wrap; margin-bottom: 26px;">${chips}</div>` : ''}
      <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(148,163,184,0.15); padding-top: 24px;">
        <div style="display: flex; font-size: 22px; color: #94a3b8;">atlantium.ai/jobs</div>
        <div style="display: flex; font-size: 22px; font-weight: 600; color: #34d399;">Apply now</div>
      </div>
    </div>
  </div>`;

  const [regular, semibold, extrabold] = await Promise.all([
    loadFont(FONT_URLS.regular),
    loadFont(FONT_URLS.semibold),
    loadFont(FONT_URLS.extrabold),
  ]);

  const image = new ImageResponse(html, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: semibold, weight: 600, style: 'normal' },
      { name: 'Inter', data: extrabold, weight: 800, style: 'normal' },
    ],
  });

  const response = new Response(image.body, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400, s-maxage=86400',
    },
  });
  await cache.put(cacheKey, response.clone());
  return response;
}

function staticFocusGroupsOg() {
  return buildOgString({
    type: 'website',
    siteName: 'Atlantium',
    title: 'Focus Groups — AI-Powered Collaboration Cohorts | Atlantium',
    description:
      'Join 2-week intensive collaborations with AI-matched members. Build meaningful connections, learn from expert leads, and ship together.',
    image: `${SITE_ORIGIN}/og-focus-groups.png`,
    url: `${SITE_ORIGIN}/focus-groups`,
    twitterCard: 'summary_large_image',
  });
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

function buildOgString({ type, siteName, title, description, image, imageWidth, imageHeight, url, twitterCard, extra }) {
  return `
    <!-- Dynamic OG Tags - Injected by Cloudflare Worker -->
    <meta property="og:type" content="${escapeHtml(type)}" />
    <meta property="og:site_name" content="${escapeHtml(siteName)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    ${imageWidth ? `<meta property="og:image:width" content="${escapeHtml(imageWidth)}" />` : ''}
    ${imageHeight ? `<meta property="og:image:height" content="${escapeHtml(imageHeight)}" />` : ''}
    <meta property="og:url" content="${escapeHtml(url)}" />
    ${extra || ''}
    <meta name="twitter:card" content="${escapeHtml(twitterCard)}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <meta name="description" content="${escapeHtml(description)}" />
    <title>${escapeHtml(title)}</title>
    <!-- End Dynamic OG Tags -->`;
}

function injectOgTags(html, ogTags) {
  html = html
    .replace(/<meta property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta property="article:[^"]*"[^>]*>/gi, '')
    .replace(/<meta name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<meta name="description"[^>]*>/gi, '')
    .replace(/<title>[^<]*<\/title>/i, '');

  return html.replace(/<head>/i, `<head>${ogTags}`);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
