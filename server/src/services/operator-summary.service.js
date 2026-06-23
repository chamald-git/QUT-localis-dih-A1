import {
  getOperatorSpendSummary,
  getOperatorSummary,
} from "../repositories/operator-summary.repository.js";

/**

* Creates a transparent staffing-pressure estimate from demand and
* booking notice.
  */
function estimateStaffingPressure(occupancyPct, bookingWindowDays) {
  const occupancy = Number(occupancyPct);
  const bookingWindow = Number(bookingWindowDays);

  if (!Number.isFinite(occupancy)) {
    return {
      level: "Unavailable",
      note: "There is not enough live demand data to estimate staffing pressure.",
    };
  }

  if (
    occupancy >= 70 &&
    Number.isFinite(bookingWindow) &&
    bookingWindow <= 30
  ) {
    return {
      level: "High",
      note: "Strong demand and shorter booking notice may require earlier roster planning.",
    };
  }

  if (
    occupancy >= 55 ||
    (Number.isFinite(bookingWindow) && bookingWindow <= 30)
  ) {
    return {
      level: "Moderate",
      note: "Demand should be monitored and staffing kept flexible.",
    };
  }

  return {
    level: "Low",
    note: "Softer demand currently allows more flexibility in staffing plans.",
  };
}

/**

* Returns live values for the Operator dashboard.
  */
export async function getOperatorSummaryCard(regionName, days = 90) {
  const [summary, spendSummary] = await Promise.all([
    getOperatorSummary(regionName, days),
    getOperatorSpendSummary(regionName, days),
  ]);

  if (!summary) {
    return null;
  }

  const staffingPressure = estimateStaffingPressure(
    summary.occupancy_pct,
    summary.booking_window_days,
  );

  const totalVisitorSpend = spendSummary.total_visitor_spend;
  const cardsSeen = spendSummary.cards_seen;
  const transactions = spendSummary.transactions;

  const spendPerVisitor = cardsSeen > 0 ? totalVisitorSpend / cardsSeen : null;

  const spendPerTransaction =
    transactions > 0 ? totalVisitorSpend / transactions : null;

  return {
    region: summary.region,
    occupancy_pct: Number(summary.occupancy_pct),
    adr: Number(summary.adr),

    average_stay_nights:
      summary.average_stay_nights === null
        ? null
        : Number(summary.average_stay_nights),

    booking_window_days:
      summary.booking_window_days === null
        ? null
        : Number(summary.booking_window_days),

    staffing_pressure: staffingPressure.level,
    staffing_pressure_note: staffingPressure.note,

    total_visitor_spend: totalVisitorSpend,
    spend_per_visitor: spendPerVisitor,
    spend_per_transaction: spendPerTransaction,
    cards_seen: cardsSeen,
    transactions,
    spend_categories: spendSummary.categories,

    data_points: Number(summary.data_points),
  };
}
