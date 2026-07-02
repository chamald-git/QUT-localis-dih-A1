import { describe, it, expect } from '@jest/globals';
import { rateLimitDetails } from './rate-limit-details.js';

const GENAI_429 =
  'got status: 429 Too Many Requests. ' +
  JSON.stringify({
    error: {
      code: 429,
      message: 'You exceeded your current quota, please check your plan and billing details.',
      status: 'RESOURCE_EXHAUSTED',
      details: [
        {
          '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
          violations: [
            {
              quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests',
              quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier',
              quotaValue: '10',
            },
          ],
        },
        { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '30s' },
      ],
    },
  });

describe('rateLimitDetails', () => {
  it('extracts reason, quota id (free-tier / per-minute) and retry delay', () => {
    const out = rateLimitDetails({ status: 429, message: GENAI_429 });
    expect(out.status).toBe(429);
    expect(out.reason).toBe('RESOURCE_EXHAUSTED');
    expect(out.quota[0].id).toContain('FreeTier');
    expect(out.quota[0].id).toContain('PerMinute');
    expect(out.retryAfter).toBe('30s');
  });

  it('falls back to a message snippet when there is no JSON', () => {
    const out = rateLimitDetails({ message: 'plain rate limit text' });
    expect(out.upstreamMessage).toBe('plain rate limit text');
    expect(out.quota).toBeUndefined();
  });

  it('handles a missing error object', () => {
    expect(rateLimitDetails(undefined)).toEqual({});
  });
});
