import { ImageResponse } from 'next/og';
import { TAGLINE } from '@/lib/site';

export const alt = 'UGNAYA: One Wallet. More Places. More Rewards.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The share preview. Colours are the brand's light values (an image can't follow the theme).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 96, background: '#F7F8FA', color: '#101828', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <svg width="120" height="120" viewBox="0 0 48 48">
            <path d="M14 8v18a10 10 0 0 0 10 10h3" fill="none" stroke="#2B4ACB" strokeWidth="7" strokeLinecap="round" />
            <path d="M34 8v18a10 10 0 0 1-10 10h-3" fill="none" stroke="#FFB020" strokeWidth="7" strokeLinecap="round" />
            <circle cx="24" cy="36" r="3.5" fill="#2B4ACB" />
          </svg>
          <div style={{ fontSize: 96, fontWeight: 800 }}>UGNAYA</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 60, fontWeight: 700 }}>{TAGLINE}</div>
        <div style={{ marginTop: 24, fontSize: 32, color: '#475467' }}>Digital loyalty for cafés and restaurants in Naga City · ugnaya.ph</div>
      </div>
    ),
    size,
  );
}
