/**
 * @what  Pull whatever quota detail Gemini included on a 429.
 * @why   Lets us tell per-minute vs per-day, and free-tier vs paid, instead of a
 *        generic "rate limited". The @google/genai SDK embeds the upstream JSON
 *        error inside err.message, so we parse it out best-effort. Pure (no SDK /
 *        config imports) so it stays unit-testable.
 *
 * @param {unknown} err
 * @returns {{ status?: number, reason?: string, upstreamMessage?: string,
 *             quota?: Array<{metric?: string, id?: string, value?: string}>,
 *             retryAfter?: string }}
 */
export function rateLimitDetails(err) {
  const out = {};
  if (typeof err?.status === 'number') out.status = err.status;

  const msg = String(err?.message ?? '');
  const start = msg.indexOf('{');
  if (start === -1) {
    if (msg) out.upstreamMessage = msg.slice(0, 300);
    return out;
  }

  let parsed;
  try {
    parsed = JSON.parse(msg.slice(start));
  } catch {
    out.upstreamMessage = msg.slice(0, 300);
    return out;
  }

  const e = parsed.error ?? parsed;
  if (e?.status) out.reason = e.status; // e.g. RESOURCE_EXHAUSTED
  if (e?.message) out.upstreamMessage = e.message;

  for (const detail of Array.isArray(e?.details) ? e.details : []) {
    const type = detail?.['@type'] ?? '';
    if (type.includes('QuotaFailure') && Array.isArray(detail.violations)) {
      // quotaId reveals FreeTier vs paid and PerMinute vs PerDay.
      out.quota = detail.violations.map((v) => ({
        metric: v.quotaMetric,
        id: v.quotaId,
        value: v.quotaValue,
      }));
    }
    if (type.includes('RetryInfo') && detail.retryDelay) {
      out.retryAfter = detail.retryDelay; // e.g. "30s"
    }
  }

  return out;
}
