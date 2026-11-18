import type { MetadataRoute } from 'next';

/** The product is private; nothing here is for search engines. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
