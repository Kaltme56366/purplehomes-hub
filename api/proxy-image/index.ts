import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Image proxy to handle CORS issues with external images
 * This fetches external images and serves them with proper CORS headers
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Validate URL is from allowed domains
  const allowedDomains = [
    'services.leadconnectorhq.com',
    'leadconnectorhq.com',
    'storage.googleapis.com',
    'images.unsplash.com',
    'source.unsplash.com',
    'i.imgur.com',
  ];

  try {
    const parsedUrl = new URL(url);
    const isAllowed = allowedDomains.some(domain => parsedUrl.hostname.includes(domain));

    if (!isAllowed) {
      return res.status(403).json({
        error: 'Domain not allowed',
        domain: parsedUrl.hostname,
        allowedDomains,
      });
    }

    // Fetch the image
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PurpleHomes/1.0)',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to fetch image',
        status: response.status,
        statusText: response.statusText,
      });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Image proxy error:', error);
    return res.status(500).json({
      error: 'Failed to proxy image',
      details: String(error),
    });
  }
}
