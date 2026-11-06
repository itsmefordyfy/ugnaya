import { withSupabase } from '@supabase/server';
import { depsFor, type ServerContext } from '../_shared/context.ts';
import { handle } from './handler.ts';

export default {
  fetch: withSupabase({ auth: 'user' }, (req: Request, ctx: ServerContext) => handle(req, depsFor(ctx))),
};
