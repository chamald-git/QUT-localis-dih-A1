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
    `"charts": an array of 2–5 objects, each { "metric": one of [${metricList}], "title": short string, "caption": one-line string, "chartSpec": a valid Vega-Lite v5 spec }.`,
    'Tell a visual STORY across the charts: choose the mark that best makes each point and vary them so the charts complement rather than repeat — a "line" for a trend over time, a "bar" to compare or rank (you may bin the dates by week or month for bars), an "area" for volume. Each chart should add a distinct insight your narrative discusses, and at least one should annotate the key moment you describe.',
    'Go DEEPER with more charts (up to 5) for richer analysis: pair an OVERALL view (all regions across the period) with FOCUSED views that drill into the story — e.g. a head-to-head of the two most significant regions, or a zoom into one notable week. Create a focus by adding a transform "filter" on "region" or "date" (the real fields); keep region as the colour encoding so colours and the one shared legend stay consistent.',
    'Fields — use ONLY these, NEVER invent field names: "region" (text), "date" (date), and the metric columns (occupancy → occupancy_pct, adr → adr, length_of_stay → avg_length_of_stay, booking_window → avg_booking_window). Put "data": {"name": "<that chart\'s metric>"} at the TOP level and DO NOT inline rows (the server supplies the raw daily rows). Encode "date" on x and the metric column on y; encode region as "color" (nominal) when multiple regions are present — keep region as the COLOUR encoding (never on an axis). The region→colour scale is fixed by the app, so the one shared legend and consistent colours apply across every chart even when a focused chart shows only some regions.',
    'For a weekly or monthly view, AGGREGATE inside the spec on the real fields: set a calendar "timeUnit" on "date" (daily → "yearmonthdate", weekly → "yearweek", monthly → "yearmonth") and "aggregate": "mean" on the metric column. NEVER reference made-up fields like "weekly_date" or "weekly_avg_*" — only the fields above exist. The app styles the axes (sparse month labels, no gridlines, no titles) and number formats.',
    'Make every chart hoverable: add a "tooltip" encoding array of { region, the period, the metric value }; for line marks include points via "mark": { "type": "line", "point": true }.',
    'Annotate the key moment: when your narrative calls out a peak, trough or threshold, make that chartSpec a LAYERED spec — keep shared "data" and "encoding" at the TOP level and set "layer": [ <the base mark>, <highlight layers> ]. Find the point with a transform on the real fields (e.g. "joinaggregate" for the max/min of the metric column, then "filter"). Make the highlight STRIKING and impossible to miss: a LARGE filled marker — "mark": { "type": "point", "size": 220, "filled": true, "stroke": "white", "strokeWidth": 2 } — at the extremum, PLUS a bold "text" label of its value just above it — "mark": { "type": "text", "fontSize": 13, "fontWeight": "bold", "dy": -14 }. Reference only existing or transform-created fields.',
    'Compact card styling: set "height": 300, do NOT set "width", do NOT set a "title" inside the chartSpec, and put the legend at the bottom with no title via "config": { "legend": { "orient": "bottom", "title": null } }.',
    'Pick the charts that best support your narrative; only use metrics from the list above.',
  ].join('\n');
}
