import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const mockUser = {
  role: 'operator',
  region: 'Noosa',
  tier: 'operator-basic',
};

const regions = ['Cairns', 'Gold Coast', 'Noosa', 'Whitsundays'];

const visitorSpending = [
  {
    label: 'Total Visitor Spend',
    value: '$2.4M',
    note: 'Placeholder until spend API is connected',
  },
  {
    label: 'Spend per Visitor',
    value: '$148',
    note: 'Placeholder until spend API is connected',
  },
  {
    label: 'Spend per Transaction',
    value: '$42',
    note: 'Placeholder until spend API is connected',
  },
];

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

export default function TourismOperatorDashboard() {
  const [selectedRegion, setSelectedRegion] = useState(mockUser.region);
  const [occupancySummary, setOccupancySummary] = useState(null);
  const [occupancyError, setOccupancyError] = useState(null);
  const [occupancyLoading, setOccupancyLoading] = useState(true);

  useEffect(() => {
    async function loadOccupancySummary() {
      setOccupancyLoading(true);
      setOccupancyError(null);

      try {
        const result = await api.getOccupancySummary(selectedRegion);
        setOccupancySummary(result.data);
      } catch (err) {
        setOccupancySummary(null);
        setOccupancyError(err.message);
      } finally {
        setOccupancyLoading(false);
      }
    }

    loadOccupancySummary();
  }, [selectedRegion]);

  const currentSnapshot = [
    {
      label: 'Visitor Demand',
      value: occupancySummary
        ? `${Number(occupancySummary.occupancy_pct).toFixed(1)}% occupancy`
        : 'Loading...',
      note: occupancySummary
        ? getDemandNote(occupancySummary.occupancy_pct)
        : 'Using live occupancy API',
    },
    {
      label: 'Average Daily Rate',
      value: occupancySummary ? `$${Number(occupancySummary.adr).toFixed(0)}` : 'Loading...',
      note: occupancySummary
        ? `Based on ${occupancySummary.data_points} recent records`
        : 'Using live occupancy API',
    },
    {
      label: 'Booking Window',
      value: '32 days',
      note: 'Placeholder until booking API is connected',
    },
    {
      label: 'Average Stay',
      value: '4.2 nights',
      note: 'Placeholder until length-of-stay API is connected',
    },
    {
      label: 'Staffing Pressure',
      value: 'High',
      note: 'Derived signal, placeholder for now',
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
          <select defaultValue="Last 90 days">
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>Year to date</option>
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
          <p>
            Demand is currently being interpreted for {selectedRegion}. A short
            term rise in occupancy may suggest that operators need to review
            staffing, stock, pricing and package offers. This is fallback text
            until the AI insight endpoint is connected.
          </p>
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
              <strong>Cards seen:</strong> 16,200
            </p>
            <p>
              <strong>Transactions:</strong> 57,000
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
            <p>Line chart: occupancy over time</p>
            <p>Line chart: average daily rate over time</p>
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
    </main>
  );
}