import { roleFraming } from './role-framings.js';

/**
 * @what  Builds the Gemini instruction block for an insight request (DIH-14).
 * @why   Keeps the prompt copy in one pure, dependency-light module (only the
 *        role framings) so it stays trivially unit-testable. The DATA rows are
 *        appended separately by the Gemini layer; this is just the instructions.
 *        Role-aware framing comes from roleFraming(role) (DIH-68); everything
 *        else (data shape + output contract) is shared across roles.
 *
 * @param {string} role  reader role (government | dmo | operator | admin)
 * @param {{ regions: string[], metrics: string[], period: { preset: string, days: number } }} appliedFilters
 * @returns {string}
 */
export function userPrompt(role, appliedFilters) {
  const { regions, metrics, period } = appliedFilters;
  const metricList = metrics.join(', ');
  return [
    'You are an analyst for Destination Insight Hubs. Explain Queensland tourism data to the user in plain English, with no jargon.',
    roleFraming(role),
    `Scope: regions ${regions.join(', ')}; metrics ${metricList}; the most recent ${period.days} days of data.`,
    'The DATA below is one row per region per date. Metric columns: occupancy_pct (fraction 0–1), adr (AUD), avg_length_of_stay (nights), avg_booking_window (days) — only the requested metrics are present.',
    'Call out peaks, troughs and notable differences between regions.',
    'Reply with ONLY a JSON object (no markdown fences) with exactly these keys:',
    '"narrative": 2–4 short plain-English paragraphs as a single string;',
    `"charts": an array of 1–3 objects, each { "metric": one of [${metricList}], "title": short string, "caption": one-line string, "chartSpec": a valid Vega-Lite v5 spec }.`,
    'In every chartSpec set "data": {"name": "<that chart\'s metric>"} and DO NOT inline data values — the server supplies the rows. Use the metric\'s column for the y field (occupancy → occupancy_pct, adr → adr, length_of_stay → avg_length_of_stay, booking_window → avg_booking_window), x = date (temporal), and color = region (nominal) when multiple regions are present; include a mark and a title.',
    'Pick the charts that best support your narrative; only use metrics from the list above.',
  ].join('\n');
}
