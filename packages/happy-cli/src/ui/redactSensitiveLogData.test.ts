import { describe, expect, it } from 'vitest';
import { inspect } from 'node:util';
import { redactSensitiveLogData } from './redactSensitiveLogData';

describe('redactSensitiveLogData', () => {
  it('removes credentials from Axios-style errors while preserving diagnostics', () => {
    const error = new Error('connect ETIMEDOUT') as Error & Record<string, any>;
    error.code = 'ETIMEDOUT';
    error.config = {
      method: 'post',
      url: 'https://api.example.com/v1/sessions?access_token=query-secret',
      headers: {
        Authorization: 'Bearer header-secret',
        'X-Api-Key': 'api-secret',
      },
      data: { token: 'body-secret' },
    };
    error.request = {
      _header: 'Authorization: Bearer raw-header-secret\r\nCookie: sid=cookie-secret',
    };
    error.self = error;

    const output = inspect(redactSensitiveLogData(error), { depth: 10 });

    expect(output).toContain('connect ETIMEDOUT');
    expect(output).toContain("code: 'ETIMEDOUT'");
    expect(output).toContain("method: 'post'");
    expect(output).toContain('[Circular]');
    for (const secret of ['query-secret', 'header-secret', 'api-secret', 'body-secret', 'raw-header-secret', 'cookie-secret']) {
      expect(output).not.toContain(secret);
    }
  });

  it('redacts sensitive environment-style keys and authorization strings', () => {
    const output = JSON.stringify(redactSensitiveLogData({
      ANTHROPIC_AUTH_TOKEN: 'env-secret',
      nested: 'Authorization: Bearer string-secret',
      safe: 'visible',
    }));

    expect(output).toContain('visible');
    expect(output).not.toContain('env-secret');
    expect(output).not.toContain('string-secret');
  });
});
