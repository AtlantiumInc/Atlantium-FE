/**
 * Consolidated Cloudflare Worker for Dynamic OG Meta Tags
 *
 * Handles all routes that need OG injection:
 *   /u/:username       — User profiles (dynamic, fetched from Xano)
 *   /index/:slug       — Articles (dynamic, fetched from Xano)
 *   /groups/:slug      — Groups (dynamic, fetched from Xano)
 *   /focus-groups      — Focus groups landing (static)
 */

const XANO_API_BASE = 'https://cloud.atlantium.ai/api:-ulnKZsX';
const APP_API_BASE = 'https://cloud.atlantium.ai/api:_c66cUCc';
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
  const res = await fetch(`${APP_API_BASE}/job_postings/${encodeURIComponent(slug)}`);
  if (!res.ok) return null;
  const job = await res.json();
  if (!job) return null;

  const salaryStr = job.salary_min
    ? `$${Math.round(job.salary_min / 1000)}k\u2013$${Math.round(job.salary_max / 1000)}k`
    : '';
  const desc = [job.seniority, job.location, salaryStr, job.content?.requirements_summary]
    .filter(Boolean)
    .join(' \u00b7 ')
    .slice(0, 200);

  return buildOgString({
    type: 'website',
    siteName: 'Atlantium',
    title: `${job.title} at ${job.company} | Atlantium Jobs`,
    description: desc || `${job.title} at ${job.company}`,
    image: `${SITE_ORIGIN}/og-jobs.png`,
    url: `${SITE_ORIGIN}/jobs/${job.slug}`,
    twitterCard: 'summary_large_image',
  });
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
