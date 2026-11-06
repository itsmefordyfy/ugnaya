import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { rpcErrorResponse, SQL_ERROR_STATUS } from '../_shared/errors.ts';

describe('SQL error codes', () => {
  it('maps a known code to its status', async () => {
    const response = rpcErrorResponse({ message: 'token_used' });
    assertEquals(response.status, 409);
    assertEquals(await response.json(), { error: 'token_used' });
    assertEquals(SQL_ERROR_STATUS.daily_limit, 429);
    assertEquals(SQL_ERROR_STATUS.insufficient_points, 402);
    assertEquals(SQL_ERROR_STATUS.pin_taken, 409);
  });
  it('hides an unknown database error', async () => {
    const response = rpcErrorResponse({ message: 'duplicate key value violates unique constraint "x"' });
    assertEquals(response.status, 500);
    assertEquals(await response.json(), { error: 'internal' });
  });
});
