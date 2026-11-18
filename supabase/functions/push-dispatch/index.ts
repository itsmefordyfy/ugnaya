import { withSupabase } from '@supabase/server';
import { depsFor, type ServerContext } from '../_shared/context.ts';
import { handle } from './handler.ts';

// Called by the database webhook with the project's secret key, not a user session.
export default {
  fetch: withSupabase({ auth: 'secret' }, (req: Request, ctx: ServerContext) => handle(req, depsFor(ctx))),
};
