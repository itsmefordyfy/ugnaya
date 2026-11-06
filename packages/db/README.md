# @ugnaya/db

Supabase's generated types for UGNAYA's database (`src/database.types.ts`) and the hand-written
shapes of the points functions' results. The types file is generated, never edited by hand:
`npm run db:types:local` from the migrations on a throwaway local Postgres, or `npm run db:types`
from the linked Supabase project. There are no tests here: the package holds only types, checked by
`npm run typecheck`.
