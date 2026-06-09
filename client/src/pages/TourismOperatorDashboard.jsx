import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

// Temporary user data so I can build the operator view before login is ready.
const mockUser = {
  role: 'operator',
  region: 'Noosa',
  tier: 'operator-basic',
};

const regions = ['Cairns', 'Gold Coast', 'Noosa', 'Whitsundays'];

// These options control how many recent rows we ask for from the occupancy API.
const timePeriods = [
  { label: 'Last 30 days', rowLimit: 30 },
  { label: 'Last 60 days', rowLimit: 60 },
  { label: 'Last 90 days', rowLimit: 90 },
];

// These values are examples until the spend API endpoints are connected.
const visitorSpending = [
  {
    label: 'Total Visitor Spend',
    value: 'Example: $2.4M',
    note: 'Mock value until spend API is connected',
  },
  {
    label: 'Spend per Visitor',
    value: 'Example: $148',
    note: 'Mock value until spend API is connected',
  },
  {
    label: 'Spend per Transaction',
    value: 'Example: $42',
    note: 'Mock value until spend API is connected',
  },
];

// Example category data for the first dashboard version.
const spendCategories = [
  { label: 'Accommodation', percentage: 90 },
  { label: 'Restaurants', percentage: 72 },
  { label: 'Transport', percentage: 58 },
  { label: 'Retail', percentage: 44 },
  { label: 'Attractions', percentage: 32 },
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

// Makes API dates easier to read on the dashboard.
function formatDate(dateString) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

// The list API returns occupancy as a decimal, so this turns it into a percent.
function formatOccupancyFromDecimal(decimalValue) {
  const occupancyNumber = Number(decimalValue);

  if (Number.isNaN(occupancyNumber)) {
    return 'Unavailable';
  }

  return `${(occupancyNumber * 100).toFixed(1)}%`;
}

// Simple wording for the live occupancy card.
function getDemandNote(occupancyValue) {
  const occupancyNumber = Number(occupancyValue);

  if (Number.isNaN(occupancyNumber)) {
    return 'Demand signal unavailable';
  }

  if (occupancyNumber >= 70) {
    return 'Demand is strong';
  }

  if (occupancyNumber >= 55) {
    return 'Demand is steady';
  }

  return 'Demand is softer';
}

// Fallback insight text for operators until the AI endpoint is connected.
function getOperatorInsight(region, summary) {
  if (!summary) {
    return `Waiting for live occupancy and ADR data for ${region}.`;
  }

  const occupancyNumber = Number(summary.occupancy_pct);
  const adrNumber = Number(summary.adr);

  if (Number.isNaN(occupancyNumber)) {
    return `Occupancy data is unavailable for ${region}. Operators may need to check the dashboard again later.`;
  }

  const adrText = Number.isNaN(adrNumber)
    ? 'ADR data is not currently available.'
    : `Average daily rate is about $${adrNumber.toFixed(0)}.`;

  if (occupancyNumber >= 70) {
    return `${region} is currently showing strong demand at ${occupancyNumber.toFixed(
      1
    )}% occupancy. ${adrText} Operators may want to confirm casual staff early, review stock levels, and check whether pricing or package offers need adjusting. This is fallback text until the AI insight endpoint is connected.`;
  }

  if (occupancyNumber >= 55) {
    return `${region} is currently showing steady demand at ${occupancyNumber.toFixed(
      1
    )}% occupancy. ${adrText} Operators may want to keep staffing flexible, monitor bookings, and prepare early offers if demand increases. This is fallback text until the AI insight endpoint is connected.`;
  }

  return `${region} is currently showing softer demand at ${occupancyNumber.toFixed(
    1
  )}% occupancy. ${adrText} Operators may want to consider targeted promotions, flexible staffing, or using quieter periods for maintenance and planning. This is fallback text until the AI insight endpoint is connected.`;
}

export default function TourismOperatorDashboard() {
  const [selectedRegion, setSelectedRegion] = useState(mockUser.region);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(timePeriods[2]);
  const [occupancySummary, setOccupancySummary] = useState(null);
  const [occupancyRows, setOccupancyRows] = useState([]);
  const [occupancyError, setOccupancyError] = useState(null);
  const [occupancyLoading, setOccupancyLoading] = useState(true);

  // Load the live occupancy data whenever the selected region or time period changes.
  useEffect(() => {
    async function loadOccupancyData() {
      setOccupancyLoading(true);
      setOccupancyError(null);

      try {
        const [summaryResult, rowsResult] = await Promise.all([
          api.getOccupancySummary(selectedRegion),
          api.getOccupancyRows(selectedRegion, selectedTimePeriod.rowLimit),
        ]);

        setOccupancySummary(summaryResult.data);
        setOccupancyRows(rowsResult.data ?? []);
      } catch (err) {
        setOccupancySummary(null);
        setOccupancyRows([]);
        setOccupancyError(err.message);
      } finally {
        setOccupancyLoading(false);
      }
    }

    loadOccupancyData();
  }, [selectedRegion, selectedTimePeriod]);

  const currentSnapshot = [
    {
      label: 'Visitor Demand',
      value: occupancySummary
        ? `${Number(occupancySummary.occupancy_pct).toFixed(1)}% occupancy`
        : occupancyError
          ? 'Unavailable'
          : 'Loading...',
      note: occupancySummary
        ? getDemandNote(occupancySummary.occupancy_pct)
        : 'Using live occupancy API',
    },
    {
      label: 'Average Daily Rate',
      value: occupancySummary
        ? `$${Number(occupancySummary.adr).toFixed(0)}`
        : occupancyError
          ? 'Unavailable'
          : 'Loading...',
      note: occupancySummary
        ? `Based on ${occupancySummary.data_points} recent records`
        : 'Using live occupancy API',
    },
    {
      label: 'Booking Window',
      value: 'Example: 32 days',
      note: 'Mock value until booking API is connected',
    },
    {
      label: 'Average Stay',
      value: 'Example: 4.2 nights',
      note: 'Mock value until length-of-stay API is connected',
    },
    {
      label: 'Staffing Pressure',
      value: 'Example: High',
      note: 'Derived signal, waiting on spend/booking data',
    },
  ];

  return (
    <main className="dashboard-shell">
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
                (period) => period.label === event.target.value
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
          Spend category
          <select defaultValue="All categories">
            <option>All categories</option>
            <option>Accommodation</option>
            <option>Food and beverage</option>
            <option>Retail</option>
            <option>Transport</option>
          </select>
        </label>
      </section>

      {occupancyError && (
        <section className="status status-error">
          <span className="dot" />
          <div>
            <strong>Occupancy data unavailable</strong>
            <p className="muted">{occupancyError}</p>
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <h2>Current Snapshot</h2>

        {occupancyLoading && (
          <p className="muted">Loading live occupancy and ADR data...</p>
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
          <h3>Plain-English Operator Insight</h3>
          <p>{getOperatorInsight(selectedRegion, occupancySummary)}</p>
        </article>
      </section>

      <section className="dashboard-section">
        <h2>Visitor Spending</h2>

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
          <article className="panel">
            <h3>Top Spend Categories</h3>

            <div className="bar-list">
              {spendCategories.map((category) => (
                <div className="bar-row" key={category.label}>
                  <span>{category.label}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <h3>Visitor Activity</h3>
            <p>
              <strong>Cards seen:</strong> Example: 16,200
            </p>
            <p>
              <strong>Transactions:</strong> Example: 57,000
            </p>
            <p className="muted">
              Placeholder values. More transactions may mean more staffing
              pressure.
            </p>
          </article>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Plan Ahead</h2>

        <div className="panel-grid">
          <article className="panel chart-placeholder">
            <h3>Occupancy and ADR Trend</h3>
            <p className="muted">
              Recent live occupancy and ADR rows for {selectedRegion} using the{' '}
              {selectedTimePeriod.label.toLowerCase()} view.
            </p>

            {occupancyLoading && (
              <p className="muted">Loading recent trend data...</p>
            )}

            {!occupancyLoading && occupancyRows.length > 0 && (
              <div className="mini-table-wrap">
                <table
                  className="mini-table"
                  aria-label={`Recent occupancy and ADR rows for ${selectedRegion}`}
                >
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Occupancy</th>
                      <th>ADR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {occupancyRows.map((row) => (
                      <tr key={`${row.date}-${row.region}`}>
                        <td>{formatDate(row.date)}</td>
                        <td>{formatOccupancyFromDecimal(row.occupancy_pct)}</td>
                        <td>${Number(row.adr).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!occupancyLoading && occupancyRows.length === 0 && (
              <p className="muted">
                No recent occupancy rows found for this region.
              </p>
            )}
          </article>

          <article className="panel chart-placeholder">
            <h3>Seasonal Pattern</h3>
            <p>Bar chart: monthly demand</p>
            <p>Peak and quiet periods</p>
          </article>
        </div>

        <article className="insight-panel">
          <h3>Growth Signal</h3>
          <p>
            Sustained high occupancy, rising daily rates, longer stays and
            strong visitor spending may suggest opportunities for extra staff,
            new packages, longer opening hours, partnerships or future
            expansion.
          </p>
        </article>
      </section>

      <section className="mvp-note">
        <h2>MVP data note</h2>
        <p>
          This dashboard currently uses live occupancy and average daily rate
          data from the backend API. Booking window, average stay, visitor
          spending, spend categories, visitor activity and staffing pressure are
          shown as example values until the related API endpoints are connected.
        </p>
      </section>
    </main>
  );
}