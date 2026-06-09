const mockUser = {
  role: 'operator',
  region: 'Noosa',
  tier: 'operator-basic',
};

const currentSnapshot = [
  {
    label: 'Visitor Demand',
    value: '72% occupancy',
    note: 'Demand is strong',
  },
  {
    label: 'Booking Window',
    value: '32 days',
    note: 'Visitors plan ahead',
  },
  {
    label: 'Average Stay',
    value: '4.2 nights',
    note: 'Good for packages',
  },
  {
    label: 'Staffing Pressure',
    value: 'High',
    note: 'Recruit/roster early',
  },
];

const visitorSpending = [
  {
    label: 'Total Visitor Spend',
    value: '$2.4M',
    note: 'Strong local activity',
  },
  {
    label: 'Spend per Visitor',
    value: '$148',
    note: 'Visitor value signal',
  },
  {
    label: 'Spend per Transaction',
    value: '$42',
    note: 'Basket size signal',
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

export default function TourismOperatorDashboard() {
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
          <strong>{mockUser.region}</strong>
        </div>
      </header>

      <section className="filter-row" aria-label="Dashboard filters">
        <label>
          Region
          <select defaultValue={mockUser.region}>
            <option>Cairns</option>
            <option>Gold Coast</option>
            <option>Noosa</option>
            <option>Whitsundays</option>
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

      <section className="dashboard-section">
        <h2>Current Snapshot</h2>
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
            Demand is currently strong in this region. Visitors are booking
            ahead and staying long enough to consider tours, dining and local
            experiences. Operators may need to confirm casual staff, prepare
            stock, and promote early-booking offers before the next busy period.
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
              More transactions may mean more staffing pressure.
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