// Writes every logo and app-icon file into packages/brand/assets from the geometry in src/:
//   npm run build --workspace @ugnaya/brand
// SVGs are the source of truth; PNGs are rendered from them with sharp. Output is committed.
import { createHash } from 'node:crypto';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { appIconSvg, layoutOf, logoSvg } from '../src/svg.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
// svg/ and png/ are regenerated; mascot/ holds Ugi's master cut-outs (tools/extract_mascot.py) and is kept.
for (const dir of ['svg', 'png']) rmSync(join(root, dir), { recursive: true, force: true });
const out = (path, data) => {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
  return file;
};

// SVG logos: layouts x tones
const toneSuffix = { full: '', onDark: '-on-dark', mono: '-mono', white: '-white' };
for (const layout of ['mark', 'horizontal', 'tagline', 'vertical']) {
  for (const tone of ['full', 'onDark', 'mono', 'white']) {
    if (layout === 'mark' && tone === 'onDark') continue; // the colour mark is the same on any background
    const name = layout === 'mark' ? 'mark' : `logo-${layout}`;
    out(`svg/${name}${toneSuffix[tone]}.svg`, logoSvg({ layout, tone }));
  }
}
out('svg/app-icon.svg', appIconSvg({ kind: 'primary', rounded: true }));
out('svg/app-icon-light.svg', appIconSvg({ kind: 'light', rounded: true }));
out('svg/app-icon-mono.svg', appIconSvg({ kind: 'mono', rounded: true }));
out('svg/favicon.svg', appIconSvg({ kind: 'favicon', rounded: true }));

const raster = async (svg, size) =>
  sharp(Buffer.from(svg), { density: (72 * size) / 1024 }).resize(size, size).png().toBuffer();
const rasterWide = async (svg, width, viewBoxWidth) =>
  sharp(Buffer.from(svg), { density: (72 * width) / viewBoxWidth }).resize({ width }).png().toBuffer();

const square = (kind) => appIconSvg({ kind, rounded: false });
const rounded = (kind) => appIconSvg({ kind, rounded: true });
const circleMask = (size) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`);

// iOS: opaque 1024 squares (the system applies the rounded corners)
out('png/ios/icon-1024.png', await sharp(await raster(square('primary'), 1024)).flatten({ background: '#0A103E' }).png().toBuffer());
out('png/ios/icon-light-1024.png', await sharp(await raster(square('light'), 1024)).flatten({ background: '#FFFFFF' }).png().toBuffer());
out('png/ios/icon-mono-1024.png', await sharp(await raster(square('mono'), 1024)).flatten({ background: '#4A17B1' }).png().toBuffer());

// Android: adaptive layers at 1024 (Expo) and 432 (108 dp at xxxhdpi), legacy launcher icons, Play Store icon
out('png/android/adaptive-foreground-1024.png', await raster(square('foreground'), 1024));
out('png/android/adaptive-foreground-432.png', await raster(square('foreground'), 432));
out('png/android/adaptive-monochrome-1024.png', await raster(square('monochromeLayer'), 1024));
out('png/android/adaptive-monochrome-432.png', await raster(square('monochromeLayer'), 432));
out('png/android/adaptive-background-1024.png', await sharp(await raster(square('background'), 1024)).flatten({ background: '#0A103E' }).png().toBuffer());
out('png/android/adaptive-background-432.png', await sharp(await raster(square('background'), 432)).flatten({ background: '#0A103E' }).png().toBuffer());
const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [name, size] of Object.entries(densities)) {
  out(`png/android/mipmap-${name}/ic_launcher.png`, await raster(rounded('primary'), size));
  out(`png/android/mipmap-${name}/ic_launcher_round.png`, await sharp(await raster(square('primary'), size)).composite([{ input: circleMask(size), blend: 'dest-in' }]).png().toBuffer());
}
out('png/android/playstore-512.png', await sharp(await raster(square('primary'), 512)).flatten({ background: '#0A103E' }).png().toBuffer());

// Web: favicons, touch icon, manifest icons
const fav = {};
for (const size of [16, 32, 48]) fav[size] = out(`png/web/favicon-${size}.png`, await raster(rounded('favicon'), size)) && await raster(rounded('favicon'), size);
const ico = (images) => {
  const header = Buffer.alloc(6); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size, 0); e.writeUInt8(size, 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8); e.writeUInt32LE(offset, 12); offset += data.length; return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
};
out('png/web/favicon.ico', ico([16, 32, 48].map((size) => ({ size, data: fav[size] }))));
out('png/web/apple-touch-icon-180.png', await sharp(await raster(square('primary'), 180)).flatten({ background: '#0A103E' }).png().toBuffer());
out('png/web/icon-192.png', await raster(rounded('primary'), 192));
out('png/web/icon-512.png', await raster(rounded('primary'), 512));
out('png/web/icon-maskable-512.png', await sharp(await raster(square('primary'), 512)).flatten({ background: '#0A103E' }).png().toBuffer());

// Expo (app.json): the names its docs use
out('png/expo/icon.png', await sharp(await raster(square('primary'), 1024)).flatten({ background: '#0A103E' }).png().toBuffer());
out('png/expo/adaptive-icon.png', await raster(square('foreground'), 1024));
out('png/expo/monochrome-icon.png', await raster(square('monochromeLayer'), 1024));
out('png/expo/favicon.png', await raster(rounded('favicon'), 48));

// Flat logo images for slides and documents (transparent, 2000 px wide)
for (const layout of ['horizontal', 'tagline', 'vertical']) {
  const { width } = layoutOf(layout);
  for (const tone of ['full', 'onDark', 'white', 'mono']) {
    out(`png/logo/logo-${layout}${toneSuffix[tone]}-2000.png`, await rasterWide(logoSvg({ layout, tone }), 2000, width));
  }
}
// The Next.js apps: browser icons (Next's file conventions). Only the public site also serves the logo kit at /brand.
const apps = join(root, '..', '..', '..', 'apps');
for (const name of ['marketing', 'app', 'admin']) {
  const dir = join(apps, name, 'src/app');
  if (!existsSync(dir)) continue;
  copyFileSync(join(root, 'svg/favicon.svg'), join(dir, 'icon.svg'));
  copyFileSync(join(root, 'png/web/favicon.ico'), join(dir, 'favicon.ico'));
  copyFileSync(join(root, 'png/web/apple-touch-icon-180.png'), join(dir, 'apple-icon.png'));
}
const kit = join(apps, 'marketing', 'public/brand');
rmSync(kit, { recursive: true, force: true });
cpSync(join(root, 'svg'), join(kit, 'svg'), { recursive: true });
cpSync(join(root, 'png/logo'), join(kit, 'png'), { recursive: true });
cpSync(join(root, 'png/ios'), join(kit, 'app-icons'), { recursive: true });
// Ugi: a WebP beside each master PNG (for the mobile apps and any non-Next use; Next optimises the PNG itself),
// and the masters copied into the public folder of the customer-facing apps (not the admin portal).
const mascot = join(root, 'mascot');
if (existsSync(mascot)) {
  for (const file of readdirSync(mascot).filter((f) => f.endsWith('.png'))) {
    await sharp(join(mascot, file)).webp({ quality: 90, alphaQuality: 100 }).toFile(join(mascot, file.replace(/\.png$/, '.webp')));
  }
  // Each file is published under a name carrying its content hash, so a changed pose always has a new address and
  // no browser or image-optimizer cache can keep showing the old one.
  const files = {};
  for (const file of readdirSync(mascot).filter((f) => f.endsWith('.png'))) {
    const hash = createHash('sha256').update(readFileSync(join(mascot, file))).digest('hex').slice(0, 10);
    files[file.replace(/\.png$/, '')] = `/mascot/${file.replace(/\.png$/, '')}.${hash}.png`;
  }
  for (const name of ['marketing', 'app']) {
    const dest = join(apps, name, 'public/mascot');
    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dest, { recursive: true });
    for (const [pose, path] of Object.entries(files)) copyFileSync(join(mascot, `${pose}.png`), join(dest, path.replace('/mascot/', '')));
  }
  writeFileSync(
    join(root, '..', 'src', 'mascot-files.ts'),
    `// Generated by scripts/build-assets.mjs. Do not edit by hand.\n// Where each Ugi pose is served (content-hashed, so a new version always has a new address).\nexport const UGI_FILES = ${JSON.stringify(files, null, 2)} as const;\n`,
  );
}
console.log('wrote', root);
