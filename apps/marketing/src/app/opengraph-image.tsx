import { ImageResponse } from 'next/og';
import { layoutOf, logoSvg } from '@ugnaya/brand';

export const alt = 'UGNAYA: One Wallet. More Places. More Rewards.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The share preview: the official lockup (with its tagline) from @ugnaya/brand on the light background.
// An image can't follow the theme, so it uses the light values.
export default function OpengraphImage() {
  const svg = logoSvg({ layout: 'tagline', tone: 'full' });
  const { width, height } = layoutOf('tagline');
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'sans-serif' }}>
        <img src={src} width={1040} height={Math.round((1040 * height) / width)} alt="" />
        <div style={{ marginTop: 56, fontSize: 30, color: '#475569' }}>ugnaya.ph</div>
      </div>
    ),
    size,
  );
}
