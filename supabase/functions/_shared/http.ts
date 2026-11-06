/** Request and response helpers shared by UGNAYA's Edge Functions (CarMind's _shared/http.ts as the model). */

/** An error the client should see: its status and a short code (and, for bad input, what was wrong). */
export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, readonly detail?: string) {
    super(detail ?? code);
  }
}
export class BadRequest extends HttpError {
  constructor(code = 'request_invalid', detail?: string) {
    super(400, code, detail);
  }
}
export class Unauthorized extends HttpError {
  constructor(code = 'sign_in_required') {
    super(401, code);
  }
}
export class Forbidden extends HttpError {
  constructor(code = 'forbidden') {
    super(403, code);
  }
}

type Body = Record<string, unknown>;

export async function readBody(req: Request): Promise<Body> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BadRequest('request_invalid', 'Expected a JSON body');
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequest('request_invalid', 'Expected a JSON object');
  }
  return body as Body;
}

export function stringField(body: Body, key: string, max = 200): string {
  const value = body[key];
  if (typeof value !== 'string' || value.trim() === '' || value.length > max) {
    throw new BadRequest('request_invalid', `"${key}" must be a non-empty string of at most ${max} characters`);
  }
  return value;
}

export function optionalStringField(body: Body, key: string, max = 200): string | null {
  return body[key] === undefined || body[key] === null || body[key] === '' ? null : stringField(body, key, max);
}

export function intField(body: Body, key: string): number {
  const value = body[key];
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new BadRequest('request_invalid', `"${key}" must be a whole number`);
  }
  return value;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function uuidField(body: Body, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || !UUID.test(value)) throw new BadRequest('request_invalid', `"${key}" must be a uuid`);
  return value;
}

/** Runs a handler and turns whatever it throws into a JSON answer, so the app always gets a reason. */
export async function respond(run: () => unknown): Promise<Response> {
  try {
    return Response.json(await run());
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json(error.detail ? { error: error.code, detail: error.detail } : { error: error.code }, { status: error.status });
    }
    console.error(error);
    return Response.json({ error: 'internal' }, { status: 500 });
  }
}
