import {
  getOperatorSpendSummary,
  getOperatorSummary,
} from "../repositories/operator-summary.repository.js";

/**
 * Converts a database value to a usable number.
 * Returns null when the value is missing or invalid.
 */
function toFiniteNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

/**
 * Rounds a number to the requested number of decimal places.
 */
function roundTo(value, decimalPlaces = 1) {
  const multiplier = 10 ** decimalPlaces;

  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

/**
 * Calculates the numerical difference between two periods.
 */
function calculateDifference(currentValue, previousValue, decimalPlaces = 1) {
  const current = toFiniteNumber(currentValue);
  const previous = toFiniteNumber(previousValue);

  if (current === null || previous === null) {
    return null;
  }

  return roundTo(current - previous, decimalPlaces);
}

/**
 * Calculates percentage change between two periods.
 */
function calculatePercentageChange(
  currentValue,
  previousValue,
  decimalPlaces = 1,
) {
  const current = toFiniteNumber(currentValue);
  const previous = toFiniteNumber(previousValue);

  if (current === null || previous === null || previous === 0) {
    return null;
  }

  return roundTo(((current - previous) / previous) * 100, decimalPlaces);
}

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
 * Calculates spending values used by the dashboard cards.
 */
function getSpendMetrics(spendSummary) {
  const totalVisitorSpend = Number(spendSummary.total_visitor_spend ?? 0);

  const cardsSeen = Number(spendSummary.cards_seen ?? 0);
  const transactions = Number(spendSummary.transactions ?? 0);

  const spendPerVisitor = cardsSeen > 0 ? totalVisitorSpend / cardsSeen : null;

  const spendPerTransaction =
    transactions > 0 ? totalVisitorSpend / transactions : null;

  return {
    totalVisitorSpend,
    cardsSeen,
    transactions,
    spendPerVisitor,
    spendPerTransaction,
  };
}

/**
 * Returns live values and previous-period comparisons for the
 * Operator dashboard.
 */
export async function getOperatorSummaryCard(regionName, days = 90) {
  const [summary, spendSummary, previousSummary, previousSpendSummary] =
    await Promise.all([
      getOperatorSummary(regionName, days, 0),
      getOperatorSpendSummary(regionName, days, 0),
      getOperatorSummary(regionName, days, days),
      getOperatorSpendSummary(regionName, days, days),
    ]);

  if (!summary) {
    return null;
  }

  const staffingPressure = estimateStaffingPressure(
    summary.occupancy_pct,
    summary.booking_window_days,
  );

  const currentSpend = getSpendMetrics(spendSummary);

  const previousSpend =
    previousSpendSummary.data_points > 0
      ? getSpendMetrics(previousSpendSummary)
      : null;

  const previousOccupancyPct = toFiniteNumber(previousSummary?.occupancy_pct);

  const previousAdr = toFiniteNumber(previousSummary?.adr);

  const previousAverageStay = toFiniteNumber(
    previousSummary?.average_stay_nights,
  );

  const previousBookingWindow = toFiniteNumber(
    previousSummary?.booking_window_days,
  );

  return {
    region: summary.region,
    occupancy_pct: Number(summary.occupancy_pct),
    adr: Number(summary.adr),

    average_stay_nights: toFiniteNumber(summary.average_stay_nights),

    booking_window_days: toFiniteNumber(summary.booking_window_days),

    staffing_pressure: staffingPressure.level,
    staffing_pressure_note: staffingPressure.note,

    total_visitor_spend: currentSpend.totalVisitorSpend,
    spend_per_visitor: currentSpend.spendPerVisitor,
    spend_per_transaction: currentSpend.spendPerTransaction,
    cards_seen: currentSpend.cardsSeen,
    transactions: currentSpend.transactions,
    spend_categories: spendSummary.categories,

    data_points: Number(summary.data_points),
    spend_data_points: Number(spendSummary.data_points),
    comparison_period_days: Number(days),

    previous_period: {
      occupancy_pct: previousOccupancyPct,
      adr: previousAdr,
      average_stay_nights: previousAverageStay,
      booking_window_days: previousBookingWindow,

      total_visitor_spend: previousSpend?.totalVisitorSpend ?? null,

      spend_per_visitor: previousSpend?.spendPerVisitor ?? null,

      spend_per_transaction: previousSpend?.spendPerTransaction ?? null,

      data_points: Number(previousSummary?.data_points ?? 0),

      spend_data_points: Number(previousSpendSummary.data_points ?? 0),
    },

    changes: {
      occupancy_percentage_points: calculateDifference(
        summary.occupancy_pct,
        previousOccupancyPct,
        1,
      ),

      adr: calculateDifference(summary.adr, previousAdr, 0),

      average_stay_nights: calculateDifference(
        summary.average_stay_nights,
        previousAverageStay,
        1,
      ),

      booking_window_days: calculateDifference(
        summary.booking_window_days,
        previousBookingWindow,
        0,
      ),

      total_visitor_spend_percent:
        previousSpend === null
          ? null
          : calculatePercentageChange(
              currentSpend.totalVisitorSpend,
              previousSpend.totalVisitorSpend,
              1,
            ),

      spend_per_visitor:
        previousSpend === null
          ? null
          : calculateDifference(
              currentSpend.spendPerVisitor,
              previousSpend.spendPerVisitor,
              2,
            ),

      spend_per_transaction:
        previousSpend === null
          ? null
          : calculateDifference(
              currentSpend.spendPerTransaction,
              previousSpend.spendPerTransaction,
              2,
            ),
    },
  };
}
