import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

const PAGES = ['', '/how-it-works', '/for-businesses', '/for-customers', '/pricing', '/faq', '/about', '/contact', '/register',
  '/privacy', '/terms', '/merchant-terms'];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: 'monthly',
    priority: path === '' ? 1 : path === '/for-businesses' || path === '/pricing' ? 0.8 : 0.5,
  }));
}
