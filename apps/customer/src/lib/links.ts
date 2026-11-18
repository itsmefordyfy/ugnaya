import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking } from 'react-native';

import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '@/constants/config';

/** A web page in the in-app browser (Safari View Controller), so the customer stays in the app. */
export function openPage(url: string): void {
  void WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET }).catch(() => Linking.openURL(url));
}

export const openTerms = () => openPage(TERMS_URL);
export const openPrivacy = () => openPage(PRIVACY_URL);

/** A new email to support; says the address when the phone has no mail app. */
export function emailSupport(subject = 'UGNAYA app'): void {
  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
  Linking.openURL(url).catch(() => Alert.alert('No mail app', `Write to us at ${SUPPORT_EMAIL}.`));
}

/** Opens a link in the app that handles it (Maps, Phone); quiet if nothing can. */
export function openExternal(url: string): void {
  Linking.openURL(url).catch(() => {});
}
