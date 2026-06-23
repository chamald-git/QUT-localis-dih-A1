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

function SummaryCard({ label, value, note }) {
  return (
    <article className="summary-card">
      <p className="card-label">{label}</p>
      <strong className="card-value">{value}</strong>
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

  const chartData = categories
    .map((category) => {
      const totalSpend = Number(category.total_spend ?? 0);
      const cardsSeen = Number(category.cards_seen ?? 0);
      const transactions = Number(category.transactions ?? 0);

      return {
        category: getCategoryDisplayName(category.category),
        raw_category: category.category,
        total_spend: totalSpend,
        display_spend: formatCompactCurrency(totalSpend),
        spend_per_recorded_card: cardsSeen > 0 ? totalSpend / cardsSeen : null,
        spend_per_transaction:
          transactions > 0 ? totalSpend / transactions : null,
        transactions,
        is_selected: category.category === selectedCategoryName,
        has_selection: hasSelection,
      };
    })
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
      label: "Total visitor spending",
      value: operatorSummary
        ? formatCurrency(displayedTotalSpend)
        : occupancyError
          ? "Unavailable"
          : "Loading...",
      note:
        selectedSpendCategory === "All categories"
          ? "Total spending across all categories"
          : `Total for ${getCategoryDisplayName(selectedSpendCategory)}`,
    },
    {
      label: "Average spend per recorded card",
      value: operatorSummary
        ? formatCurrency(displayedSpendPerVisitor, 2)
        : occupancyError
          ? "Unavailable"
          : "Loading...",
      note: "This is an estimate because one person may use more than one card.",
    },
    {
      label: "Average purchase amount",
      value: operatorSummary
        ? formatCurrency(displayedSpendPerTransaction, 2)
        : occupancyError
          ? "Unavailable"
          : "Loading...",
      note: "Average value of each purchase recorded.",
    },
  ];

  const currentSnapshot = [
    {
      label: "Regional visitor demand",
      value: occupancySummary
        ? `${Number(occupancySummary.occupancy_pct).toFixed(1)}% occupancy`
        : occupancyError
          ? "Unavailable"
          : "Loading...",
      note: occupancySummary
        ? getDemandNote(occupancySummary.occupancy_pct)
        : "Using the latest available regional information.",
    },
    {
      label: "Average room price",
      value: occupancySummary
        ? formatCurrency(occupancySummary.adr)
        : occupancyError
          ? "Unavailable"
          : "Loading...",
      note: occupancySummary
        ? "Average price of an occupied room during the selected period."
        : "Using the latest available regional information.",
    },
    {
      label: "How far ahead people book",
      value:
        operatorSummary?.booking_window_days !== null &&
        operatorSummary?.booking_window_days !== undefined
          ? `${operatorSummary.booking_window_days} days`
          : occupancyError
            ? "Unavailable"
            : "Loading...",
      note: "On average, visitors booked this many days before arriving.",
    },
    {
      label: "Average length of stay",
      value:
        operatorSummary?.average_stay_nights !== null &&
        operatorSummary?.average_stay_nights !== undefined
          ? `${operatorSummary.average_stay_nights} nights`
          : occupancyError
            ? "Unavailable"
            : "Loading...",
      note: "Average number of nights visitors stayed.",
    },
    {
      label: "Likely staffing needs",
      value:
        operatorSummary?.staffing_pressure ??
        (occupancyError ? "Unavailable" : "Loading..."),
      note:
        operatorSummary?.staffing_pressure_note ??
        "Estimated from room occupancy and how far ahead visitors are booking.",
    },
  ];

  return (
    <main className="dashboard-shell operator-dashboard">
      <header className="dashboard-header">
        <div>
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
        <label>
          Region
          <select
            value={selectedRegion}
            onChange={(event) => setSelectedRegion(event.target.value)}
          >
            {regions.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>
        </label>

        <label>
          Time period
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
        </label>

        <label>
          Spending category
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
              note={item.note}
            />
          ))}
        </div>

        <article className="insight-panel">
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
                <p className="muted">The standard summary is shown instead.</p>
              </div>
            </div>
          )}

          {operatorStory && (
            <p className="muted">
              Generated by AI using the selected region and time period.
            </p>
          )}
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
              note={item.note}
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
