/**
 * Cloudflare Worker for Dynamic OG Meta Tags
 *
 * This worker intercepts requests to /u/:username and injects
 * dynamic Open Graph meta tags for social media sharing.
 */

const XANO_API_BASE = 'https://cloud.atlantium.ai/api:-ulnKZsX';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Check if this is a profile page request
    const profileMatch = pathname.match(/^\/u\/([^\/]+)\/?$/);

    if (profileMatch) {
      const username = decodeURIComponent(profileMatch[1]);
      return handleProfilePage(request, username, env);
    }

    // For all other requests, pass through to origin
    return fetch(request);
  }
};

async function handleProfilePage(request, username, env) {
  // Check if this is a bot/crawler (for OG tags) or a real user
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|Slackbot|TelegramBot|Discordbot|Pinterest|Googlebot/i.test(userAgent);

  // Fetch the original page
  const originalResponse = await fetch(request);

  // If not a bot or not HTML, return original
  const contentType = originalResponse.headers.get('content-type') || '';
  if (!isBot || !contentType.includes('text/html')) {
    return originalResponse;
  }

  // Fetch profile data from Xano
  let profile = null;
  let ogData = null;

  try {
    const profileResponse = await fetch(
      `${XANO_API_BASE}/profile?username=${encodeURIComponent(username)}`
    );

    if (profileResponse.ok) {
      const data = await profileResponse.json();
      profile = data.profile;
      ogData = data.og;
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
  }

  // Get the original HTML
  let html = await originalResponse.text();

  // If we have profile data, inject OG tags
  if (profile && ogData) {
    const ogTags = `
    <!-- Dynamic OG Tags - Injected by Cloudflare Worker -->
    <meta property="og:type" content="${escapeHtml(ogData.type)}" />
    <meta property="og:site_name" content="${escapeHtml(ogData.site_name)}" />
    <meta property="og:title" content="${escapeHtml(ogData.title)}" />
    <meta property="og:description" content="${escapeHtml(ogData.description)}" />
    <meta property="og:image" content="${escapeHtml(ogData.image)}" />
    <meta property="og:url" content="${escapeHtml(ogData.url)}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(ogData.title)}" />
    <meta name="twitter:description" content="${escapeHtml(ogData.description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogData.image)}" />
    <title>${escapeHtml(ogData.title)}</title>
    <!-- End Dynamic OG Tags -->`;

    // Remove existing OG tags and title, then inject new ones
    html = html
      .replace(/<meta property="og:[^"]*"[^>]*>/gi, '')
      .replace(/<meta name="twitter:[^"]*"[^>]*>/gi, '')
      .replace(/<title>[^<]*<\/title>/i, '');

    // Inject after <head>
    html = html.replace(/<head>/i, `<head>${ogTags}`);
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

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
