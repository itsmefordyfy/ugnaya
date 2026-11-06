This repository is a monorepo: `apps/web` is a Next.js website, and `apps/customer` and `apps/business` will be Expo apps. The Expo rules below apply inside those app folders; `CLAUDE.md` describes the whole repo.

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Read first

`CLAUDE.md` is the source of truth for this project (what the app is, its stack, the owner's
decisions). The owner's development rules for every mobile app are in the shared playbook at
`~/.claude/skills/mobile-app-playbook/` (outside this repo): start at its `docs/PROJECT_PLAYBOOK.md`,
which maps each topic to its file; workflows are in its `skills/*/SKILL.md`. Where this file and
those differ, `CLAUDE.md` and the playbook win. This file only adds the generic Expo rules below for
tools that don't read them.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

This project uses npm.

```bash
npx expo install <package>  # ALWAYS use instead of npm install — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck (and tests, when the project has them) before declaring any task done; the
full definition of done is in `docs/TESTING_CHECKLIST.md`.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`, tests included.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

EAS can build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and ship over-the-air updates (`eas update`). Run EAS CLI as `npx eas-cli@latest <command>`; substitute that for bare `eas` in docs examples. The owner runs releases; never start a build for the stores or a submission unless asked.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Ask the owner before adding anything large or with a cost. Docs: https://docs.expo.dev/versions/latest/index.md
- No Prettier or other formatter: match the surrounding style.
