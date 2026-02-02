/**
 * Cloudflare Worker for Article Dynamic OG Meta Tags
 *
 * This worker intercepts requests to /index/:slug and injects
 * dynamic Open Graph meta tags for social media sharing.
 */

// Xano API - same base URL used by frontend for public endpoints
const XANO_API_BASE = 'https://cloud.atlantium.ai/api:-ulnKZsX';

// Your site's origin (update when deploying)
const SITE_ORIGIN = 'https://atlantium.ai';

// Bot detection regex
const BOT_USER_AGENTS = /facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|Pinterest|Googlebot/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Check if this is an article page request
    const articleMatch = pathname.match(/^\/index\/([^\/]+)\/?$/);

    if (articleMatch) {
      const slug = decodeURIComponent(articleMatch[1]);
      return handleArticlePage(request, slug, env);
    }

    // For all other requests, pass through to origin
    return fetch(request);
  }
};

/**
 * Handle article page requests
 */
async function handleArticlePage(request, slug, env) {
  // Check if this is a bot/crawler (for OG tags) or a real user
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = BOT_USER_AGENTS.test(userAgent);

  // Fetch the original page
  const originalResponse = await fetch(request);

  // If not a bot or not HTML, return original
  const contentType = originalResponse.headers.get('content-type') || '';
  if (!isBot || !contentType.includes('text/html')) {
    return originalResponse;
  }

  // Fetch article data from Xano
  let article = null;
  let ogData = null;

  try {
    const articleResponse = await fetch(
      `${XANO_API_BASE}/article?slug=${encodeURIComponent(slug)}`
    );

    if (articleResponse.ok) {
      const data = await articleResponse.json();
      article = data.article;
      ogData = data.og;
    }
  } catch (error) {
    console.error('Error fetching article:', error);
  }

  // Get the original HTML
  let html = await originalResponse.text();

  // If we have article data, inject OG tags
  if (article && ogData) {
    // Format published time as ISO string
    const publishedTime = ogData.published_time
      ? new Date(ogData.published_time).toISOString()
      : '';

    // Build tags array
    const tagMetas = (ogData.tags || [])
      .map(tag => `<meta property="article:tag" content="${escapeHtml(tag)}" />`)
      .join('\n    ');

    const ogTags = `
    <!-- Dynamic OG Tags - Injected by Cloudflare Worker -->
    <meta property="og:type" content="${escapeHtml(ogData.type)}" />
    <meta property="og:site_name" content="${escapeHtml(ogData.site_name)}" />
    <meta property="og:title" content="${escapeHtml(ogData.title)}" />
    <meta property="og:description" content="${escapeHtml(ogData.description)}" />
    <meta property="og:image" content="${escapeHtml(ogData.image)}" />
    <meta property="og:url" content="${escapeHtml(ogData.url)}" />
    <meta property="article:author" content="${escapeHtml(ogData.author)}" />
    <meta property="article:published_time" content="${escapeHtml(publishedTime)}" />
    ${tagMetas}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(ogData.title)}" />
    <meta name="twitter:description" content="${escapeHtml(ogData.description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogData.image)}" />
    <meta name="description" content="${escapeHtml(ogData.description)}" />
    <title>${escapeHtml(ogData.title)}</title>
    <!-- End Dynamic OG Tags -->`;

    html = injectOgTags(html, ogTags);
  }

  // Return modified HTML
  return new Response(html, {
    status: originalResponse.status,
    headers: {
      ...Object.fromEntries(originalResponse.headers),
      'content-type': 'text/html;charset=UTF-8',
    },
  });
}

/**
 * Remove existing OG tags and inject new ones
 */
function injectOgTags(html, ogTags) {
  // Remove existing OG tags, Twitter tags, and title
  html = html
    .replace(/<meta property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta property="article:[^"]*"[^>]*>/gi, '')
    .replace(/<meta name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<meta name="description"[^>]*>/gi, '')
    .replace(/<title>[^<]*<\/title>/i, '');

  // Inject after <head>
  return html.replace(/<head>/i, `<head>${ogTags}`);
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
