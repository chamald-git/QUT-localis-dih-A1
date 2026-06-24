import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import VegaChart from "../components/VegaChart.jsx";

// Temporary user data until login is ready.
const mockUser = {
  role: "operator",
  region: "Noosa",
  tier: "operator-basic",
};

const regions = ["Cairns", "Gold Coast", "Noosa", "Whitsundays"];

const categoryNameRules = [
  ["FOOD & GROCERY", "Groceries"],
  ["RESTAURANTS", "Restaurants"],
  ["HOME IMPROVEMENT", "Home and garden"],
  ["HEALTH CARE", "Health and pharmacies"],
  ["DRUG STO", "Health and pharmacies"],
  ["FUEL", "Fuel"],
  ["RETAIL STORES", "Retail stores"],
  ["PKG STORES", "Bottle shops"],
  ["BEER/WINE/LI", "Bottle shops"],
  ["RETAIL GOODS", "Other retail"],
  ["FAST FOOD", "Fast food"],
  ["HOTELS/MOTELS", "Accommodation"],
  ["RESORTS", "Accommodation"],
  ["AUTOMOTIVE", "Automotive"],
  ["BARS/TAVERNS", "Bars and pubs"],
  ["LOUNGES", "Bars and pubs"],
  ["DISCOUNT & VARIETY", "Discount and variety stores"],
  ["RETAIL SERVICES", "Retail services"],
];

function getCategoryDisplayName(categoryName) {
  const originalName = String(categoryName ?? "").trim();

  if (!originalName) {
    return "Other spending";
  }

  const upperName = originalName.toUpperCase();
  const matchingRule = categoryNameRules.find(([keyword]) =>
    upperName.includes(keyword),
  );

  if (matchingRule) {
    return matchingRule[1];
  }

  return originalName
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// These options control the dashboard period and generated explanation.
const timePeriods = [
  {
    label: "Last 30 days",
    rowLimit: 30,
    apiPeriod: "last_30_days",
  },
  {
    label: "Last 60 days",
    rowLimit: 60,
    apiPeriod: "last_60_days",
  },
  {
    label: "Last 90 days",
    rowLimit: 90,
    apiPeriod: "last_90_days",
  },
];

function DashboardIcon({ name, className = "", size = 20 }) {
  const iconPaths = {
    demand: (
      <>
        <circle cx="8" cy="8" r="3" />
        <circle cx="16" cy="7" r="2.5" />
        <path d="M2.5 20c.7-4 2.8-6 5.5-6s4.8 2 5.5 6" />
        <path d="M12.5 14.5c1-.8 2.1-1.2 3.5-1.2 2.7 0 4.6 1.9 5.2 5.7" />
      </>
    ),
    rate: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M14.8 8.6c-.7-.7-1.6-1.1-2.8-1.1-1.7 0-2.8.8-2.8 2s1 1.8 3 2.1c2 .4 3 1.1 3 2.5 0 1.3-1.2 2.3-3.1 2.3-1.3 0-2.5-.5-3.3-1.4" />
        <path d="M12 5.8v12.4" />
      </>
    ),
    booking: (
      <>
        <rect x="4" y="5.5" width="16" height="14" rx="2" />
        <path d="M8 3.5v4M16 3.5v4M4 9.5h16" />
        <path d="M8 13h3M13 13h3M8 16h3" />
      </>
    ),
    stay: (
      <>
        <path d="M3 18V9M21 18V11.5c0-1.4-1.1-2.5-2.5-2.5H9v9" />
        <path d="M3 14h18M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      </>
    ),
    staffing: (
      <>
        <circle cx="12" cy="7" r="3" />
        <circle cx="5.5" cy="9" r="2" />
        <circle cx="18.5" cy="9" r="2" />
        <path d="M6.5 20c.5-4.2 2.3-6.5 5.5-6.5s5 2.3 5.5 6.5" />
        <path d="M1.8 19c.4-3.1 1.7-4.8 3.9-4.8M22.2 19c-.4-3.1-1.7-4.8-3.9-4.8" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 7.5h14.5A2.5 2.5 0 0 1 21 10v8.5H5A2 2 0 0 1 3 16.5v-11A2 2 0 0 1 5 3.5h11" />
        <path d="M16 11.5h5v4h-5a2 2 0 1 1 0-4Z" />
      </>
    ),
    visitor: (
      <>
        <circle cx="12" cy="7" r="3" />
        <path d="M5.5 20c.6-4.6 2.7-7 6.5-7s5.9 2.4 6.5 7" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3v-17Z" />
        <path d="M9 8h6M9 11.5h6M9 15h3" />
      </>
    ),
    location: (
      <>
        <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
    tag: (
      <>
        <path d="m20 13-7 7-9-9V4h7l9 9Z" />
        <circle cx="8.5" cy="8.5" r="1.5" />
      </>
    ),
    insight: (
      <>
        <path d="M8.5 16.5h7M9.5 20h5" />
        <path d="M8.2 14.5C6.8 13.4 6 11.7 6 9.8a6 6 0 1 1 12 0c0 1.9-.8 3.6-2.2 4.7-.6.5-.9 1-.9 1.5H9.1c0-.5-.3-1-.9-1.5Z" />
      </>
    ),
  };

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {iconPaths[name] ?? iconPaths.insight}
    </svg>
  );
}

function SummaryCard({ label, value, change, note, icon }) {
  let changeClass = "card-change card-change-same";

  if (change?.startsWith("Up ")) {
    changeClass = "card-change card-change-up";
  }

  if (change?.startsWith("Down ")) {
    changeClass = "card-change card-change-down";
  }

  return (
    <article className="summary-card">
      <div className="summary-card-top">
        <span className="metric-icon" aria-hidden="true">
          <DashboardIcon name={icon} size={20} />
        </span>

        <div className="summary-card-heading">
          <p className="card-label">{label}</p>
          <strong className="card-value">{value}</strong>
        </div>
      </div>

      {change && <p className={changeClass}>{change}</p>}

      <p className="card-note">{note}</p>
    </article>
  );
}

// Makes API dates easier to read.
function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

// Room occupancy rows are returned as decimals.
function formatOccupancyFromDecimal(decimalValue) {
  const occupancyNumber = Number(decimalValue);

  if (Number.isNaN(occupancyNumber)) {
    return "Unavailable";
  }

  return `${(occupancyNumber * 100).toFixed(1)}%`;
}

function formatCurrency(value, maximumFractionDigits = 0) {
  if (value === null || value === undefined) {
    return "Unavailable";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits,
  }).format(number);
}

function formatCompactCurrency(value) {
  if (value === null || value === undefined) {
    return "Unavailable";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
}

function formatNumber(value) {
  if (value === null || value === undefined) {
    return "Unavailable";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-AU").format(number);
}

function getComparisonText(value, formattedValue, periodDays) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  if (number === 0) {
    return `About the same as the previous ${periodDays} days`;
  }

  const direction = number > 0 ? "Up" : "Down";

  return `${direction} ${formattedValue} compared with the previous ${periodDays} days`;
}

function formatUnitChange(
  value,
  singularUnit,
  pluralUnit,
  periodDays,
  decimalPlaces = 1,
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  const absoluteValue = Math.abs(number);
  const unit = absoluteValue === 1 ? singularUnit : pluralUnit;
  const formattedValue = `${absoluteValue.toFixed(decimalPlaces)} ${unit}`;

  return getComparisonText(value, formattedValue, periodDays);
}

function formatCurrencyChange(value, periodDays, decimalPlaces = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return getComparisonText(
    value,
    formatCurrency(Math.abs(number), decimalPlaces),
    periodDays,
  );
}

function formatPercentChange(value, periodDays, decimalPlaces = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return getComparisonText(
    value,
    `${Math.abs(number).toFixed(decimalPlaces)}%`,
    periodDays,
  );
}

function getOrdinal(position) {
  const remainder100 = position % 100;

  if (remainder100 >= 11 && remainder100 <= 13) {
    return `${position}th`;
  }

  switch (position % 10) {
    case 1:
      return `${position}st`;
    case 2:
      return `${position}nd`;
    case 3:
      return `${position}rd`;
    default:
      return `${position}th`;
  }
}

// Explains room occupancy in everyday language.
function getDemandNote(occupancyValue) {
  const occupancyNumber = Number(occupancyValue);

  if (!Number.isFinite(occupancyNumber)) {
    return "Room occupancy information is not available.";
  }

  const roundedOccupancy = Math.round(occupancyNumber);

  if (occupancyNumber >= 70) {
    return `About ${roundedOccupancy} in every 100 available rooms were occupied. Demand is strong.`;
  }

  if (occupancyNumber >= 55) {
    return `About ${roundedOccupancy} in every 100 available rooms were occupied. Demand is steady.`;
  }

  return `About ${roundedOccupancy} in every 100 available rooms were occupied. Demand is quieter.`;
}

// This is shown when the generated explanation is not available.
function getOperatorInsight(region, summary) {
  if (!summary) {
    return `Waiting for the latest room occupancy and room price information for ${region}.`;
  }

  const occupancyNumber = Number(summary.occupancy_pct);
  const roomPriceNumber = Number(summary.adr);

  if (!Number.isFinite(occupancyNumber)) {
    return `Room occupancy information is not available for ${region}. Please check again later.`;
  }

  const roomPriceText = Number.isFinite(roomPriceNumber)
    ? `The average room price is about $${roomPriceNumber.toFixed(0)}.`
    : "Average room price information is not currently available.";

  if (occupancyNumber >= 70) {
    return `${region} currently has strong visitor demand, with ${occupancyNumber.toFixed(
      1,
    )}% of available rooms occupied. ${roomPriceText} Consider confirming casual staff early, checking stock levels and reviewing prices or package offers.`;
  }

  if (occupancyNumber >= 55) {
    return `${region} currently has steady visitor demand, with ${occupancyNumber.toFixed(
      1,
    )}% of available rooms occupied. ${roomPriceText} Keep staffing flexible, watch forward bookings and prepare offers in case demand increases.`;
  }

  return `${region} currently has quieter visitor demand, with ${occupancyNumber.toFixed(
    1,
  )}% of available rooms occupied. ${roomPriceText} Consider targeted promotions, flexible staffing, or using quieter periods for maintenance and planning.`;
}

// Uses recent room occupancy and price information to create a simple summary.
function getTrendSummary(rows) {
  if (!rows.length) {
    return null;
  }

  const sortedRows = [...rows].sort(
    (firstRow, secondRow) =>
      new Date(firstRow.date).getTime() - new Date(secondRow.date).getTime(),
  );

  const firstRow = sortedRows[0];
  const lastRow = sortedRows[sortedRows.length - 1];

  const occupancyValues = sortedRows
    .map((row) => Number(row.occupancy_pct))
    .filter((value) => !Number.isNaN(value));

  const adrValues = sortedRows
    .map((row) => Number(row.adr))
    .filter((value) => !Number.isNaN(value));

  if (!occupancyValues.length || !adrValues.length) {
    return null;
  }

  const averageOccupancy =
    occupancyValues.reduce((total, value) => total + value, 0) /
    occupancyValues.length;

  const averageAdr =
    adrValues.reduce((total, value) => total + value, 0) / adrValues.length;

  const firstOccupancy = Number(firstRow.occupancy_pct);
  const lastOccupancy = Number(lastRow.occupancy_pct);
  const firstAdr = Number(firstRow.adr);
  const lastAdr = Number(lastRow.adr);

  if (
    Number.isNaN(firstOccupancy) ||
    Number.isNaN(lastOccupancy) ||
    Number.isNaN(firstAdr) ||
    Number.isNaN(lastAdr)
  ) {
    return null;
  }

  return {
    averageOccupancy: averageOccupancy * 100,
    averageAdr,
    occupancyChange: (lastOccupancy - firstOccupancy) * 100,
    adrChange: lastAdr - firstAdr,
  };
}

// Gives the trend numbers a practical operator meaning.
function getTrendMessage(summary) {
  if (!summary) {
    return "Waiting for enough recent information to show a trend.";
  }

  if (summary.occupancyChange > 2) {
    return "Room occupancy increased during this period. You may want to prepare for busier trading.";
  }

  if (summary.occupancyChange < -2) {
    return "Room occupancy decreased during this period. Watch forward bookings and consider targeted offers.";
  }

  return "Room occupancy changed very little during this period. Keep staffing flexible and continue checking bookings.";
}

function SpendCategoryBarChart({
  categories,
  selectedCategoryName,
  region,
  periodLabel,
}) {
  if (!categories.length) {
    return <p className="muted">No spending data is available.</p>;
  }

  const hasSelection = selectedCategoryName !== "All categories";

  const groupedCategories = categories.reduce((groups, category) => {
  const displayName = getCategoryDisplayName(category.category);

  const totalSpend = Number(category.total_spend ?? 0);
  const cardsSeen = Number(category.cards_seen ?? 0);
  const transactions = Number(category.transactions ?? 0);

  const existingCategory = groups.get(displayName) ?? {
    category: displayName,
    total_spend: 0,
    cards_seen: 0,
    transactions: 0,
    is_selected: false,
    has_selection: hasSelection,
  };

  existingCategory.total_spend += totalSpend;
  existingCategory.cards_seen += cardsSeen;
  existingCategory.transactions += transactions;

  if (category.category === selectedCategoryName) {
    existingCategory.is_selected = true;
  }

  groups.set(displayName, existingCategory);

  return groups;
}, new Map());

const chartData = Array.from(groupedCategories.values())
  .map((category) => ({
    category: category.category,
    total_spend: category.total_spend,
    display_spend: formatCompactCurrency(category.total_spend),

    spend_per_recorded_card:
      category.cards_seen > 0
        ? category.total_spend / category.cards_seen
        : null,

    spend_per_transaction:
      category.transactions > 0
        ? category.total_spend / category.transactions
        : null,

    transactions: category.transactions,
    is_selected: category.is_selected,
    has_selection: category.has_selection,
  }))
  .sort(
    (firstCategory, secondCategory) =>
      secondCategory.total_spend - firstCategory.total_spend,
  );

  const maximumSpend = Math.max(
    ...chartData.map((category) => category.total_spend),
    1,
  );

  const chartSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    height: {
      step: 46,
    },
    encoding: {
      y: {
        field: "category",
        type: "nominal",
        sort: "-x",
        axis: {
          labelLimit: 190,
          labelPadding: 10,
          labelFontSize: 14,
          labelFontWeight: 600,
          title: null,
        },
      },
      x: {
        field: "total_spend",
        type: "quantitative",
        scale: {
          domain: [0, maximumSpend * 1.2],
          nice: true,
        },
        axis: {
          format: "$,.2s",
          tickCount: 5,
          labelFontSize: 13,
          title: "Total visitor spending",
          titleFontSize: 13,
          titlePadding: 12,
          gridColor: "#dcebe5",
          gridOpacity: 0.75,
        },
      },
    },
    layer: [
      {
        mark: {
          type: "bar",
          cornerRadiusEnd: 6,
          size: 28,
        },
        encoding: {
          color: {
            condition: {
              test: "datum.is_selected",
              value: "#c84b2f",
            },
            value: "#0d3b2e",
            legend: null,
          },
          opacity: {
            condition: {
              test: "datum.is_selected || !datum.has_selection",
              value: 1,
            },
            value: 0.35,
            legend: null,
          },
          tooltip: [
            {
              field: "category",
              type: "nominal",
              title: "Category",
            },
            {
              field: "total_spend",
              type: "quantitative",
              title: "Total visitor spending",
              format: "$,.2f",
            },
            {
              field: "spend_per_recorded_card",
              type: "quantitative",
              title: "Average spend per recorded card",
              format: "$,.2f",
            },
            {
              field: "spend_per_transaction",
              type: "quantitative",
              title: "Average purchase amount",
              format: "$,.2f",
            },
            {
              field: "transactions",
              type: "quantitative",
              title: "Recorded purchases",
              format: ",.0f",
            },
          ],
        },
      },
      {
        mark: {
          type: "text",
          align: "left",
          baseline: "middle",
          dx: 10,
          fontSize: 14,
          fontWeight: 700,
        },
        encoding: {
          text: {
            field: "display_spend",
            type: "nominal",
          },
          color: {
            value: "#1a2420",
          },
          opacity: {
            condition: {
              test: "datum.is_selected || !datum.has_selection",
              value: 1,
            },
            value: 0.55,
            legend: null,
          },
        },
      },
    ],
    config: {
      axis: {
        labelFont: "system-ui",
        titleFont: "system-ui",
      },
      text: {
        font: "system-ui",
      },
      view: {
        stroke: null,
      },
    },
  };

  return (
    <>
      <p className="muted chart-intro">
        Categories are ordered from highest to lowest spending for {region} over
        the {periodLabel.toLowerCase()}. Point to or tap a bar to see exact
        amounts and averages.
      </p>

      {hasSelection && (
        <p className="muted chart-selection-note">
          {getCategoryDisplayName(selectedCategoryName)} is highlighted while
          the other categories remain visible for comparison.
        </p>
      )}

      <VegaChart spec={chartSpec} data={chartData} />
    </>
  );
}

function SpendShareDonutChart({
  categories,
  selectedCategoryName,
  totalSpend,
}) {
  if (!categories.length || !Number.isFinite(Number(totalSpend))) {
    return null;
  }

  const recordedTotal = Number(totalSpend);

  if (recordedTotal <= 0) {
    return null;
  }

  const sortedCategories = [...categories].sort(
    (firstCategory, secondCategory) =>
      Number(secondCategory.total_spend ?? 0) -
      Number(firstCategory.total_spend ?? 0),
  );

  const selectedCategory =
    selectedCategoryName === "All categories"
      ? null
      : sortedCategories.find(
          (category) => category.category === selectedCategoryName,
        );

  const chartColors = ["#0d3b2e", "#c84b2f", "#4f7d6c", "#dcebe5"];

  let chartData;
  let centreLabel;
  let centreValue;
  let description;

  if (selectedCategory) {
    const selectedSpend = Number(selectedCategory.total_spend ?? 0);
    const otherSpend = Math.max(recordedTotal - selectedSpend, 0);
    const selectedShare = (selectedSpend / recordedTotal) * 100;

    chartData = [
      {
        segment: getCategoryDisplayName(selectedCategory.category),
        spend: selectedSpend,
        percentage: selectedShare,
        color: chartColors[1],
      },
      {
        segment: "All other spending",
        spend: otherSpend,
        percentage: (otherSpend / recordedTotal) * 100,
        color: chartColors[3],
      },
    ];

    centreLabel = "Selected share";
    centreValue = `${selectedShare.toFixed(1)}%`;
    description = `${getCategoryDisplayName(
      selectedCategory.category,
    )} made up about ${selectedShare.toFixed(
      1,
    )}% of all visitor spending recorded.`;
  } else {
    const topCategories = sortedCategories.slice(0, 3);
    const topThreeSpend = topCategories.reduce(
      (total, category) => total + Number(category.total_spend ?? 0),
      0,
    );
    const otherSpend = Math.max(recordedTotal - topThreeSpend, 0);
    const topThreeShare = (topThreeSpend / recordedTotal) * 100;

    chartData = topCategories.map((category, index) => {
      const spend = Number(category.total_spend ?? 0);

      return {
        segment: getCategoryDisplayName(category.category),
        spend,
        percentage: (spend / recordedTotal) * 100,
        color: chartColors[index],
      };
    });

    if (otherSpend > 0) {
      chartData.push({
        segment: "All other categories",
        spend: otherSpend,
        percentage: (otherSpend / recordedTotal) * 100,
        color: chartColors[3],
      });
    }

    centreLabel = "Top three";
    centreValue = `${topThreeShare.toFixed(1)}%`;
    description = `The top three categories made up ${topThreeShare.toFixed(
      1,
    )}% of all visitor spending recorded.`;
  }

  const colorDomain = chartData.map((item) => item.segment);
  const colorRange = chartData.map((item) => item.color);

  const chartSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: 210,
    height: 210,
    layer: [
      {
        mark: {
          type: "arc",
          innerRadius: 58,
          outerRadius: 92,
          cornerRadius: 3,
          stroke: "#ffffff",
          strokeWidth: 2,
        },
        encoding: {
          theta: {
            field: "spend",
            type: "quantitative",
            stack: true,
          },
          color: {
            field: "segment",
            type: "nominal",
            scale: {
              domain: colorDomain,
              range: colorRange,
            },
            legend: null,
          },
          order: {
            field: "spend",
            type: "quantitative",
            sort: "descending",
          },
          tooltip: [
            {
              field: "segment",
              type: "nominal",
              title: "Category",
            },
            {
              field: "spend",
              type: "quantitative",
              title: "Visitor spending",
              format: "$,.2f",
            },
            {
              field: "percentage",
              type: "quantitative",
              title: "Share of all spending",
              format: ".1f",
            },
          ],
        },
      },
      {
        data: {
          values: [
            {
              label: centreLabel,
            },
          ],
        },
        mark: {
          type: "text",
          dy: -9,
          color: "#5c6b65",
          fontSize: 13,
          fontWeight: 600,
        },
        encoding: {
          text: {
            field: "label",
            type: "nominal",
          },
        },
      },
      {
        data: {
          values: [
            {
              value: centreValue,
            },
          ],
        },
        mark: {
          type: "text",
          dy: 14,
          color: "#0d3b2e",
          fontSize: 22,
          fontWeight: 700,
        },
        encoding: {
          text: {
            field: "value",
            type: "nominal",
          },
        },
      },
    ],
    config: {
      view: {
        stroke: null,
      },
      text: {
        font: "system-ui",
      },
    },
  };

  return (
    <section
      className="spend-share-section"
      aria-labelledby="spend-share-heading"
    >
      <div>
        <h4 id="spend-share-heading">How visitor spending is divided</h4>
        <p className="muted">{description}</p>
      </div>

      <div className="spend-share-chart-wrap">
        <VegaChart spec={chartSpec} data={chartData} />

        <div
          className="spend-share-legend"
          aria-label="Visitor spending share legend"
        >
          {chartData.map((item) => (
            <div className="spend-share-legend-item" key={item.segment}>
              <span
                className="spend-share-swatch"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />

              <div className="spend-share-legend-copy">
                <strong>{item.segment}</strong>
                <span>
                  {formatCompactCurrency(item.spend)} ·{" "}
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SpendCategoryTable({
  categories,
  showTotals,
  operatorSummary,
  region,
}) {
  if (!categories.length) {
    return null;
  }

  return (
    <details className="spend-data-details">
      <summary>View exact amounts</summary>

      <p className="muted spend-data-help">
        Open this table to see the exact amounts used in the chart.
      </p>

      <div className="mini-table-wrap">
        <table
          className="mini-table"
          aria-label={`Visitor spending details for ${region}`}
        >
          <thead>
            <tr>
              <th>Category</th>
              <th>Total visitor spending</th>
              <th>Average spend per recorded card</th>
              <th>Average purchase amount</th>
              <th>Recorded purchases</th>
            </tr>
          </thead>

          <tbody>
            {categories.map((category) => {
              const cardsSeen = Number(category.cards_seen ?? 0);
              const transactions = Number(category.transactions ?? 0);
              const totalSpend = Number(category.total_spend ?? 0);

              const spendPerRecordedCard =
                cardsSeen > 0 ? totalSpend / cardsSeen : null;

              const spendPerTransaction =
                transactions > 0 ? totalSpend / transactions : null;

              return (
                <tr key={category.category}>
                  <td>{getCategoryDisplayName(category.category)}</td>
                  <td>{formatCurrency(totalSpend)}</td>
                  <td>{formatCurrency(spendPerRecordedCard, 2)}</td>
                  <td>{formatCurrency(spendPerTransaction, 2)}</td>
                  <td>{formatNumber(transactions)}</td>
                </tr>
              );
            })}
          </tbody>

          {showTotals && (
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td>{formatCurrency(operatorSummary?.total_visitor_spend)}</td>
                <td>{formatCurrency(operatorSummary?.spend_per_visitor, 2)}</td>
                <td>
                  {formatCurrency(operatorSummary?.spend_per_transaction, 2)}
                </td>
                <td>{formatNumber(operatorSummary?.transactions)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </details>
  );
}

export default function TourismOperatorDashboard() {
  const [selectedRegion, setSelectedRegion] = useState(mockUser.region);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(timePeriods[2]);
  const [selectedSpendCategory, setSelectedSpendCategory] =
    useState("All categories");

  const [occupancySummary, setOccupancySummary] = useState(null);
  const [occupancyRows, setOccupancyRows] = useState([]);
  const [operatorSummary, setOperatorSummary] = useState(null);
  const [occupancyError, setOccupancyError] = useState(null);
  const [occupancyLoading, setOccupancyLoading] = useState(true);

  const [operatorStory, setOperatorStory] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Loads new data when the selected region or time period changes.
  useEffect(() => {
    setSelectedSpendCategory("All categories");
    setOperatorStory(null);
    setAiError(null);

    async function loadDashboardData() {
      setOccupancyLoading(true);
      setOccupancyError(null);
      setOperatorSummary(null);

      try {
        const [summaryResult, rowsResult, operatorSummaryResult] =
          await Promise.all([
            api.getOccupancySummary(selectedRegion),
            api.getOccupancyRows(selectedRegion, selectedTimePeriod.rowLimit),
            api.getOperatorSummary(selectedRegion, selectedTimePeriod.rowLimit),
          ]);

        setOccupancySummary(summaryResult.data);
        setOccupancyRows(rowsResult.data ?? []);
        setOperatorSummary(operatorSummaryResult.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        setOccupancySummary(null);
        setOccupancyRows([]);
        setOperatorSummary(null);
        setOccupancyError(errorMessage);
      } finally {
        setOccupancyLoading(false);
      }
    }

    loadDashboardData();
  }, [selectedRegion, selectedTimePeriod]);

  // Requests a generated explanation using the selected filters.
  async function generateAiInsight() {
    setAiLoading(true);
    setAiError(null);

    try {
      const result = await api.getInsights({
        regions: [selectedRegion],
        metrics: [
          "occupancy",
          "adr",
          "length_of_stay",
          "booking_window",
          "spend",
        ],
        period: selectedTimePeriod.apiPeriod,
        role: "operator",
      });

      if (!result.data?.narrative) {
        throw new Error("No explanation was returned.");
      }

      setOperatorStory(result.data);
    } catch (err) {
      console.error("Operator explanation failed:", err);

      const errorMessage = err instanceof Error ? err.message : String(err);

      const isHighDemandError =
        errorMessage.includes('"code":503') ||
        errorMessage.includes('"status":"UNAVAILABLE"') ||
        errorMessage.toLowerCase().includes("high demand") ||
        errorMessage.toLowerCase().includes("temporarily unavailable");

      setOperatorStory(null);
      setAiError(
        isHighDemandError
          ? "The explanation service is busy right now. Please try again shortly."
          : errorMessage,
      );
    } finally {
      setAiLoading(false);
    }
  }

  const trendSummary = getTrendSummary(occupancyRows);

  const operatorInsight =
    operatorStory?.narrative ??
    getOperatorInsight(selectedRegion, occupancySummary);

  const spendCategories = operatorSummary?.spend_categories ?? [];

  const selectedCategory =
    selectedSpendCategory === "All categories"
      ? null
      : spendCategories.find(
          (category) => category.category === selectedSpendCategory,
        );

  const visibleSpendCategories = selectedCategory
    ? [selectedCategory]
    : spendCategories;

  const displayedTotalSpend =
    selectedCategory?.total_spend ?? operatorSummary?.total_visitor_spend;

  const displayedCardsSeen =
    selectedCategory?.cards_seen ?? operatorSummary?.cards_seen;

  const displayedTransactions =
    selectedCategory?.transactions ?? operatorSummary?.transactions;

  const displayedSpendPerVisitor = selectedCategory
    ? selectedCategory.cards_seen > 0
      ? selectedCategory.total_spend / selectedCategory.cards_seen
      : null
    : operatorSummary?.spend_per_visitor;

  const displayedSpendPerTransaction = selectedCategory
    ? selectedCategory.transactions > 0
      ? selectedCategory.total_spend / selectedCategory.transactions
      : null
    : operatorSummary?.spend_per_transaction;

  const sortedSpendCategories = [...spendCategories].sort(
    (firstCategory, secondCategory) =>
      Number(secondCategory.total_spend ?? 0) -
      Number(firstCategory.total_spend ?? 0),
  );

  const topSpendCategory = sortedSpendCategories[0] ?? null;

  const topTransactionCategory =
    [...spendCategories].sort(
      (firstCategory, secondCategory) =>
        Number(secondCategory.transactions ?? 0) -
        Number(firstCategory.transactions ?? 0),
    )[0] ?? null;

  const totalRecordedSpend = Number(
    operatorSummary?.total_visitor_spend ??
      spendCategories.reduce(
        (total, category) => total + Number(category.total_spend ?? 0),
        0,
      ),
  );

  const transactionsPerCard =
    Number(displayedCardsSeen) > 0
      ? Number(displayedTransactions) / Number(displayedCardsSeen)
      : null;

  const selectedCategoryRank = selectedCategory
    ? sortedSpendCategories.findIndex(
        (category) => category.category === selectedCategory.category,
      ) + 1
    : null;

  const selectedCategoryShare =
    selectedCategory && totalRecordedSpend > 0
      ? (Number(selectedCategory.total_spend) / totalRecordedSpend) * 100
      : null;

  const topCategoryShare =
    topSpendCategory && totalRecordedSpend > 0
      ? (Number(topSpendCategory.total_spend) / totalRecordedSpend) * 100
      : null;

  const activityTakeaways = selectedCategory
    ? [
        `${getCategoryDisplayName(
          selectedCategory.category,
        )} is ${getOrdinal(selectedCategoryRank)} of ${
          spendCategories.length
        } categories for total visitor spending.`,
        `${getCategoryDisplayName(
          selectedCategory.category,
        )} made up about ${selectedCategoryShare?.toFixed(
          1,
        )}% of all visitor spending recorded.`,
        `The average recorded purchase was ${formatCurrency(
          displayedSpendPerTransaction,
          2,
        )}.`,
        `${formatNumber(
          displayedTransactions,
        )} purchases were recorded in this category.`,
      ]
    : [
        topSpendCategory
          ? `Visitors spent the most on ${getCategoryDisplayName(
              topSpendCategory.category,
            ).toLowerCase()}: about ${formatCompactCurrency(
              topSpendCategory.total_spend,
            )}. This was around ${topCategoryShare?.toFixed(
              1,
            )}% of all spending recorded.`
          : "Spending information by category is not yet available.",
        topTransactionCategory
          ? `${getCategoryDisplayName(
              topTransactionCategory.category,
            )} had the most recorded purchases, with about ${formatNumber(
              topTransactionCategory.transactions,
            )}.`
          : "Recorded purchase information is not yet available.",
        transactionsPerCard !== null
          ? `Each recorded payment card was used for about ${transactionsPerCard.toFixed(
              1,
            )} purchases on average.`
          : "Average purchases per recorded card cannot be calculated from the available information.",
        `The average recorded purchase was ${formatCurrency(
          displayedSpendPerTransaction,
          2,
        )}.`,
      ];

  const visitorSpending = [
    {
      icon: "wallet",
      label: "Total Visitor Spend",
      value: operatorSummary
        ? formatCurrency(displayedTotalSpend)
        : occupancyError
          ? "Unavailable"
          : "Loading...",
      change:
        selectedSpendCategory === "All categories"
          ? formatPercentChange(
              operatorSummary?.changes?.total_visitor_spend_percent,
              selectedTimePeriod.rowLimit,
            )
          : null,
      note:
        selectedSpendCategory === "All categories"
          ? "Total across all spending categories"
          : `Total for ${selectedSpendCategory}`,
    },
    {
      icon: "visitor",
      label: "Spend per Visitor",
      value: operatorSummary
        ? formatCurrency(displayedSpendPerVisitor, 2)
        : occupancyError
          ? "Unavailable"
          : "Loading...",
      change:
        selectedSpendCategory === "All categories"
          ? formatCurrencyChange(
              operatorSummary?.changes?.spend_per_visitor,
              selectedTimePeriod.rowLimit,
              2,
            )
          : null,
      note: "Approximate value using recorded cards",
    },
    {
      icon: "receipt",
      label: "Spend per Transaction",
      value: operatorSummary
        ? formatCurrency(displayedSpendPerTransaction, 2)
        : occupancyError
          ? "Unavailable"
          : "Loading...",
      change:
        selectedSpendCategory === "All categories"
          ? formatCurrencyChange(
              operatorSummary?.changes?.spend_per_transaction,
              selectedTimePeriod.rowLimit,
              2,
            )
          : null,
      note: "Average value of each recorded transaction",
    },
  ];

  const currentSnapshot = [
    {
      icon: "demand",
      label: "Visitor Demand",
      value: occupancySummary
        ? `${Number(occupancySummary.occupancy_pct).toFixed(1)}% occupancy`
        : occupancyError
          ? "Unavailable"
          : "Loading...",
      change: formatUnitChange(
        operatorSummary?.changes?.occupancy_percentage_points,
        "percentage point",
        "percentage points",
        selectedTimePeriod.rowLimit,
        1,
      ),
      note: occupancySummary
        ? getDemandNote(occupancySummary.occupancy_pct)
        : "Using live occupancy API",
    },
    {
      icon: "rate",
      label: "Average Daily Rate",
      value: occupancySummary
        ? formatCurrency(occupancySummary.adr)
        : occupancyError
          ? "Unavailable"
          : "Loading...",
      change: formatCurrencyChange(
        operatorSummary?.changes?.adr,
        selectedTimePeriod.rowLimit,
        0,
      ),
      note: occupancySummary
        ? `Based on ${occupancySummary.data_points} recent records`
        : "Using live occupancy API",
    },
    {
      icon: "booking",
      label: "Booking Window",
      value:
        operatorSummary?.booking_window_days !== null &&
        operatorSummary?.booking_window_days !== undefined
          ? `${operatorSummary.booking_window_days} days`
          : occupancyError
            ? "Unavailable"
            : "Loading...",
      change: formatUnitChange(
        operatorSummary?.changes?.booking_window_days,
        "day",
        "days",
        selectedTimePeriod.rowLimit,
        0,
      ),
      note: "Average time between booking and arrival",
    },
    {
      icon: "stay",
      label: "Average Stay",
      value:
        operatorSummary?.average_stay_nights !== null &&
        operatorSummary?.average_stay_nights !== undefined
          ? `${operatorSummary.average_stay_nights} nights`
          : occupancyError
            ? "Unavailable"
            : "Loading...",
      change: formatUnitChange(
        operatorSummary?.changes?.average_stay_nights,
        "night",
        "nights",
        selectedTimePeriod.rowLimit,
        1,
      ),
      note: "Average visitor length of stay",
    },
    {
      icon: "staffing",
      label: "Estimated Staffing Pressure",
      value:
        operatorSummary?.staffing_pressure ??
        (occupancyError ? "Unavailable" : "Loading..."),
      change: null,
      note:
        operatorSummary?.staffing_pressure_note ??
        "Calculated from live demand and booking notice",
    },
  ];

  return (
    <main className="dashboard-shell operator-dashboard">
      <header className="dashboard-header">


        <div className="dashboard-header-copy">
          <p className="eyebrow">Destination Insight Hubs</p>
          <h1>Tourism Operator Dashboard</h1>
          <p className="subtitle">
            Practical demand, staffing and growth signals for local tourism
            businesses.
          </p>
        </div>

        <div className="user-pill">
          <span>{mockUser.role}</span>
          <strong>{selectedRegion}</strong>
        </div>
      </header>

      <section className="filter-row" aria-label="Dashboard filters">
        <label className="filter-field">
          <span className="filter-label">Region</span>
          <span className="select-shell">
            <DashboardIcon className="select-icon" name="location" size={18} />
            <select
              value={selectedRegion}
              onChange={(event) => setSelectedRegion(event.target.value)}
            >
              {regions.map((region) => (
                <option key={region}>{region}</option>
              ))}
            </select>
          </span>
        </label>

        <label className="filter-field">
          <span className="filter-label">Time period</span>
          <span className="select-shell">
            <DashboardIcon className="select-icon" name="booking" size={18} />
            <select
              value={selectedTimePeriod.label}
              onChange={(event) => {
                const newTimePeriod = timePeriods.find(
                  (period) => period.label === event.target.value,
                );

                if (newTimePeriod) {
                  setSelectedTimePeriod(newTimePeriod);
                }
              }}
            >
              {timePeriods.map((period) => (
                <option key={period.label}>{period.label}</option>
              ))}
            </select>
          </span>
        </label>

        <label className="filter-field">
          <span className="filter-label">Spending category</span>
          <span className="select-shell">
            <DashboardIcon className="select-icon" name="tag" size={18} />
            <select
              value={selectedSpendCategory}
              onChange={(event) => setSelectedSpendCategory(event.target.value)}
            >
              <option value="All categories">All categories</option>

              {spendCategories.map((category) => (
                <option key={category.category} value={category.category}>
                  {getCategoryDisplayName(category.category)}
                </option>
              ))}
            </select>
          </span>
        </label>
      </section>

      {occupancyError && (
        <section className="status status-error">
          <span className="dot" />
          <div>
            <strong>Dashboard information unavailable</strong>
            <p className="muted">{occupancyError}</p>
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <h2>Current situation</h2>

        {occupancyLoading && (
          <p className="muted">Loading the latest regional information...</p>
        )}

        <div className="summary-grid">
          {currentSnapshot.map((item) => (
            <SummaryCard
              key={item.label}
              label={item.label}
              value={item.value}
              change={item.change}
              note={item.note}
              icon={item.icon}
            />
          ))}
        </div>

        <article className="insight-panel operator-insight-panel">
          <span className="insight-icon" aria-hidden="true">
            <DashboardIcon name="insight" size={24} />
          </span>

          <div className="operator-insight-copy">
            <h3>What this means for your business</h3>

            <p>{operatorInsight}</p>

            <button
              type="button"
              className="btn"
              onClick={generateAiInsight}
              disabled={aiLoading || occupancyLoading || !occupancySummary}
            >
              {aiLoading ? "Preparing explanation..." : "Explain these results"}
            </button>

            {aiError && (
              <div className="status status-error" aria-live="polite">
                <div>
                  <strong>Explanation unavailable</strong>
                  <p className="muted">{aiError}</p>
                  <p className="muted">
                    The standard summary is shown instead.
                  </p>
                </div>
              </div>
            )}

            {operatorStory && (
              <p className="muted">
                Generated by AI using the selected region and time period.
              </p>
            )}
          </div>


        </article>
      </section>

      <section className="dashboard-section">
        <h2>Visitor spending</h2>

        <div className="summary-grid three-columns">
          {visitorSpending.map((item) => (
            <SummaryCard
              key={item.label}
              label={item.label}
              value={item.value}
              change={item.change}
              note={item.note}
              icon={item.icon}
            />
          ))}
        </div>

        <div className="panel-grid">
          <article className="panel spending-chart-panel">
            <h3>Where visitors spent money</h3>

            {occupancyLoading ? (
              <p className="muted">Loading spending information...</p>
            ) : (
              <>
                <SpendCategoryBarChart
                  categories={spendCategories}
                  selectedCategoryName={selectedSpendCategory}
                  region={selectedRegion}
                  periodLabel={selectedTimePeriod.label}
                />

                <SpendCategoryTable
                  categories={visibleSpendCategories}
                  showTotals={selectedSpendCategory === "All categories"}
                  operatorSummary={operatorSummary}
                  region={selectedRegion}
                />
              </>
            )}
          </article>

          <article className="panel visitor-activity-panel">
            <h3>Recorded spending activity</h3>

            <p className="muted activity-scope">
              {selectedSpendCategory === "All categories"
                ? "Activity across all spending categories."
                : `Activity recorded for ${getCategoryDisplayName(selectedSpendCategory)}.`}
            </p>

            <div className="activity-stat-grid">
              <div className="activity-stat">
                <span className="activity-stat-label">
                  Payment cards recorded
                </span>
                <strong className="activity-stat-value">
                  {operatorSummary
                    ? formatNumber(displayedCardsSeen)
                    : occupancyError
                      ? "Unavailable"
                      : "Loading..."}
                </strong>
              </div>

              <div className="activity-stat">
                <span className="activity-stat-label">Recorded purchases</span>
                <strong className="activity-stat-value">
                  {operatorSummary
                    ? formatNumber(displayedTransactions)
                    : occupancyError
                      ? "Unavailable"
                      : "Loading..."}
                </strong>
              </div>

              <div className="activity-stat">
                <span className="activity-stat-label">
                  Average purchases per recorded card
                </span>
                <strong className="activity-stat-value">
                  {operatorSummary && transactionsPerCard !== null
                    ? transactionsPerCard.toFixed(1)
                    : occupancyError
                      ? "Unavailable"
                      : "Loading..."}
                </strong>
              </div>
            </div>

            <div className="quick-takeaways" aria-live="polite">
              <h4>What stands out</h4>

              <ul>
                {activityTakeaways.map((takeaway) => (
                  <li key={takeaway}>{takeaway}</li>
                ))}
              </ul>
            </div>

            {!occupancyLoading && (
              <SpendShareDonutChart
                categories={spendCategories}
                selectedCategoryName={selectedSpendCategory}
                totalSpend={totalRecordedSpend}
              />
            )}

            <p className="muted activity-data-note">
              Payment cards are used as an estimate of visitor activity. One
              person may use more than one card, so this is not a count of
              unique visitors.
            </p>
          </article>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Plan ahead</h2>

        <div className="panel-grid">
          <article className="panel chart-placeholder">
            <h3>Room occupancy and average room price</h3>

            <p className="muted">
              Recent room occupancy and average room price information for{" "}
              {selectedRegion} over the {selectedTimePeriod.label.toLowerCase()}
              .
            </p>

            {occupancyLoading && (
              <p className="muted">Loading recent room information...</p>
            )}

            {!occupancyLoading && occupancyRows.length > 0 && (
              <div className="mini-table-wrap">
                <table
                  className="mini-table"
                  aria-label={`Recent room occupancy and average room price information for ${selectedRegion}`}
                >
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Occupancy</th>
                      <th>Average room price</th>
                    </tr>
                  </thead>

                  <tbody>
                    {occupancyRows.map((row) => (
                      <tr key={`${row.date}-${row.region}`}>
                        <td>{formatDate(row.date)}</td>
                        <td>{formatOccupancyFromDecimal(row.occupancy_pct)}</td>
                        <td>{formatCurrency(row.adr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!occupancyLoading && occupancyRows.length === 0 && (
              <p className="muted">
                No recent room occupancy information was found for this region.
              </p>
            )}
          </article>

          <article className="panel chart-placeholder">
            <h3>What changed during this period</h3>

            {trendSummary ? (
              <>
                <p>
                  <strong>Average room occupancy:</strong>{" "}
                  {trendSummary.averageOccupancy.toFixed(1)}%
                </p>

                <p>
                  <strong>Average room price:</strong>{" "}
                  {formatCurrency(trendSummary.averageAdr)}
                </p>

                <p>
                  <strong>Change in room occupancy:</strong> about{" "}
                  {Math.abs(trendSummary.occupancyChange).toFixed(1)}{" "}
                  {trendSummary.occupancyChange >= 0 ? "more" : "fewer"} rooms
                  occupied out of every 100 at the end of the period
                </p>

                <p>
                  <strong>Change in average room price:</strong>{" "}
                  {formatCurrency(Math.abs(trendSummary.adrChange))}{" "}
                  {trendSummary.adrChange >= 0 ? "higher" : "lower"} at the end
                  of the period
                </p>

                <p className="muted">{getTrendMessage(trendSummary)}</p>
              </>
            ) : (
              <p className="muted">
                Waiting for enough recent information to show a trend.
              </p>
            )}
          </article>
        </div>

        <article className="insight-panel">
          <h3>Planning opportunities</h3>

          <p>
            If room occupancy, room prices, length of stay and visitor spending
            remain high, you may want to consider extra staff, new packages,
            longer opening hours, local partnerships or future expansion.
          </p>
        </article>
      </section>

      <section className="mvp-note">
        <h2>About this data</h2>

        <p>
          This dashboard uses the latest available regional room occupancy, room
          price, booking, length-of-stay and card-spending information. Likely
          staffing needs are an estimate based on room occupancy and how far
          ahead people book. Payment cards are used as an estimate of visitor
          activity; one person may use more than one card.
        </p>
      </section>
    </main>
  );
}
