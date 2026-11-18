/**
 * App-wide words (common actions, tab names). English only for now; each feature keeps its own copy next to it. Kept in one
 * place so a second language later is a translation, not a refactor.
 */
export const STRINGS = {
  common: {
    back: 'Back',
    close: 'Close',
    cancel: 'Cancel',
    done: 'Done',
    save: 'Save',
    retry: 'Try again',
    tryAgain: 'Try again',
    somethingWrong: 'Something went wrong',
    dataSafe: 'Your points are safe. Check your connection and try again.',
    seeAll: 'See all',
    points: 'points',
  },
  tabs: {
    home: 'Home',
    wallet: 'Wallet',
    code: 'My code',
    discover: 'Discover',
    account: 'Account',
  },
} as const;

export type Strings = typeof STRINGS;
