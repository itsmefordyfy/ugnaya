import type { MerchantCategory } from '@/api/types';
import type { IconName } from '@/components/ui/icon';
import type { Tone } from '@/constants/theme';

/** How each business category reads in the app: its name, icon and tone (the database's merchant_category values). */
export const CATEGORIES: Record<MerchantCategory, { label: string; icon: IconName; tone: Tone }> = {
  cafe: { label: 'Café', icon: 'local_cafe', tone: 'amber' },
  milk_tea: { label: 'Milk tea', icon: 'emoji_food_beverage', tone: 'teal' },
  restaurant: { label: 'Restaurant', icon: 'restaurant', tone: 'rose' },
  bakery: { label: 'Bakery', icon: 'bakery_dining', tone: 'plum' },
  other_food: { label: 'Food', icon: 'lunch_dining', tone: 'sky' },
  other: { label: 'Shop', icon: 'storefront', tone: 'neutral' },
};

export const CATEGORY_ORDER: readonly MerchantCategory[] = ['cafe', 'milk_tea', 'restaurant', 'bakery', 'other_food', 'other'];

export function categoryOf(value: string | null | undefined) {
  return CATEGORIES[(value ?? 'other') as MerchantCategory] ?? CATEGORIES.other;
}
