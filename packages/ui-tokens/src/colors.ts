/** UGNAYA's colours (business plan section 12). Mango is never text on white: too little contrast. */
export type ColorSet = {
  primary: string;
  onPrimary: string;
  reward: string;
  onReward: string;
  success: string;
  danger: string;
  ink: string;
  inkMuted: string;
  surface: string;
  card: string;
  border: string;
};

export const colors: { light: ColorSet; dark: ColorSet } = {
  light: {
    primary: '#2B4ACB',
    onPrimary: '#FFFFFF',
    reward: '#FFB020',
    onReward: '#101828',
    success: '#1F9D63',
    danger: '#D92D20',
    ink: '#101828',
    inkMuted: '#475467',
    surface: '#F7F8FA',
    card: '#FFFFFF',
    border: '#E4E7EC',
  },
  dark: {
    primary: '#6F86F0',
    onPrimary: '#0B0F17',
    reward: '#FFC14D',
    onReward: '#101828',
    success: '#3CC489',
    danger: '#F97066',
    ink: '#F2F4F7',
    inkMuted: '#98A2B3',
    surface: '#0B0F17',
    card: '#161B26',
    border: '#2A3140',
  },
};
