import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hrefTo, siteUrls } from './urls.ts';

test('development defaults: four apps on four local ports', () => {
  assert.deepEqual(siteUrls({ development: true }), {
    marketing: 'http://localhost:3000',
    app: 'http://localhost:3001',
    merchant: 'http://localhost:3003',
    admin: 'http://localhost:3002',
  });
});

test('production defaults are the four public domains', () => {
  assert.deepEqual(siteUrls({ development: false }), {
    marketing: 'https://ugnaya.com',
    app: 'https://app.ugnaya.com',
    merchant: 'https://merchant.ugnaya.com',
    admin: 'https://admin.ugnaya.com',
  });
});

test('environment values override the defaults (staging) and lose a trailing slash', () => {
  const urls = siteUrls({ development: false, marketing: 'https://staging.ugnaya.com/', app: 'https://app.staging.ugnaya.com' });
  assert.equal(urls.marketing, 'https://staging.ugnaya.com');
  assert.equal(urls.app, 'https://app.staging.ugnaya.com');
  assert.equal(urls.admin, 'https://admin.ugnaya.com');
});

test('an empty value counts as unset; anything that is not an http(s) origin is refused', () => {
  assert.equal(siteUrls({ development: false, app: '' }).app, 'https://app.ugnaya.com');
  assert.throws(() => siteUrls({ development: false, app: 'not a url' }), /app/);
  assert.throws(() => siteUrls({ development: false, admin: 'ftp://admin.example.com' }), /admin/);
  assert.throws(() => siteUrls({ development: false, marketing: 'https://ugnaya.com/path' }), /marketing/);
});

test('hrefTo builds a link into another app and keeps query parameters', () => {
  assert.equal(hrefTo('https://app.ugnaya.com', '/login'), 'https://app.ugnaya.com/login');
  assert.equal(hrefTo('https://app.ugnaya.com', '/register', { type: 'merchant' }), 'https://app.ugnaya.com/register?type=merchant');
  assert.equal(hrefTo('https://app.ugnaya.com', '/register', { type: 'customer', next: '/wallet' }), 'https://app.ugnaya.com/register?type=customer&next=%2Fwallet');
});

test('hrefTo skips empty parameters and insists on a leading slash', () => {
  assert.equal(hrefTo('https://app.ugnaya.com', '/login', { next: undefined, x: '' }), 'https://app.ugnaya.com/login');
  assert.throws(() => hrefTo('https://app.ugnaya.com', 'login'), /start with/);
});
