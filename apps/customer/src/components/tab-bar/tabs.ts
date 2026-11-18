import type { MaterialSymbolName } from '@/components/ui/material-symbols';
import type { Strings } from '@/constants/strings';

export type TabName = 'index' | 'wallet' | 'code' | 'discover' | 'account';

export type Tab = {
  name: TabName;
  href: '/' | '/wallet' | '/code' | '/discover' | '/account';
  /** Which interface string names the tab. */
  label: keyof Strings['tabs'];
  /** The same rounded Material Symbol on both platforms. */
  icon: MaterialSymbolName;
};

/** The tabs, in order, shared by the iOS and Android tab bars so they never drift apart. The member code sits in the middle. */
export const TABS: readonly Tab[] = [
  { name: 'index', href: '/', label: 'home', icon: 'home' },
  { name: 'wallet', href: '/wallet', label: 'wallet', icon: 'account_balance_wallet' },
  { name: 'code', href: '/code', label: 'code', icon: 'qr_code_2' },
  { name: 'discover', href: '/discover', label: 'discover', icon: 'storefront' },
  { name: 'account', href: '/account', label: 'account', icon: 'person' },
];
