# Tourism Operator Dashboard Testing and Notes

## Feature purpose

The Tourism Operator Dashboard is designed for tourism businesses such as accommodation providers, tour operators, restaurants and local attractions.

The dashboard focuses on practical business decisions for the operator's own region. It helps operators understand visitor demand, average daily rate, recent occupancy trends, staffing pressure, visitor spending and longer-term growth signals.

For the MVP version, the dashboard uses a mock operator user:

```js
role: 'operator'
region: 'Noosa'
tier: 'operator-basic'
```

This allows the dashboard to be built before the full login/JWT role system is connected.

---

## Current implementation status

* Tourism Operator Dashboard page: implemented.
* Region dropdown: implemented.
* Visitor Demand card: connected to the live occupancy summary API.
* Average Daily Rate card: connected to the live occupancy summary API.
* Recent occupancy/ADR table: connected to the live occupancy list API.
* Booking Window card: mock value until the API is connected.
* Average Stay card: mock value until the API is connected.
* Staffing Pressure card: mock derived value until more data is connected.
* Visitor Spending cards: mock values until the spend API is connected.
* Top Spend Categories: mock values until the spend category API is connected.
* Plain-English Operator Insight: fallback text until the AI insight endpoint is connected.

---

## Data used in the MVP

* Visitor Demand:

  * Data source: `/api/occupancy/summary?region=`
  * Status: live data.

* Average Daily Rate:

  * Data source: `/api/occupancy/summary?region=`
  * Status: live data.

* Recent occupancy/ADR table:

  * Data source: `/api/occupancy?region=&limit=5`
  * Status: live data.

* Booking Window:

  * Data source: future booking or length-of-stay endpoint.
  * Status: mock data.

* Average Stay:

  * Data source: future length-of-stay endpoint.
  * Status: mock data.

* Visitor Spending:

  * Data source: future spend summary endpoint.
  * Status: mock data.

* Spend Categories:

  * Data source: future spend categories endpoint.
  * Status: mock data.

* Staffing Pressure:

  * Data source: future derived signal using occupancy, booking and spend data.
  * Status: mock data.

* AI Insight:

  * Data source: future AI insights endpoint.
  * Status: fallback text.

---

## Manual test cases

* Dashboard loads successfully:

  * Steps: open the app in the browser.
  * Expected result: Tourism Operator Dashboard appears without crashing.
  * Result: pass.

* Region dropdown displays all regions:

  * Steps: open the Region dropdown.
  * Expected result: Cairns, Gold Coast, Noosa and Whitsundays are available.
  * Result: pass.

* Default mock operator region appears:

  * Steps: load the dashboard.
  * Expected result: Noosa appears as the selected region and in the user pill.
  * Result: pass.

* Visitor Demand loads from API:

  * Steps: load the dashboard with the backend running.
  * Expected result: Visitor Demand shows a live occupancy percentage.
  * Result: pass.

* Average Daily Rate loads from API:

  * Steps: load the dashboard with the backend running.
  * Expected result: Average Daily Rate shows a live dollar value.
  * Result: pass.

* Region change updates summary cards:

  * Steps: change the region dropdown.
  * Expected result: Visitor Demand and Average Daily Rate update for the selected region.
  * Result: pass.

* Recent occupancy/ADR table loads:

  * Steps: open the Plan Ahead section.
  * Expected result: the table shows recent dates, occupancy percentages and ADR values.
  * Result: pass.

* Region change updates recent table:

  * Steps: change the selected region.
  * Expected result: recent occupancy/ADR table updates for the selected region.
  * Result: pass.

* Placeholder values are clearly labelled:

  * Steps: check Booking Window, Average Stay, Staffing Pressure and Visitor Spending sections.
  * Expected result: mock/example values are clearly marked and do not appear to be live data.
  * Result: pass.

* API error message appears if data is unavailable:

  * Steps: stop the backend server and refresh the app.
  * Expected result: a clear “Occupancy data unavailable” message appears.
  * Result: not tested yet.

* Dashboard remains readable on laptop screen:

  * Steps: view the dashboard in the browser.
  * Expected result: cards, panels and tables are readable and organised.
  * Result: pass.

* Dashboard remains usable on smaller screen:

  * Steps: resize the browser window.
  * Expected result: sections stack vertically and remain readable.
  * Result: not tested yet.

---

## Design notes

The dashboard is organised into three main sections:

* Current Snapshot:

  * This section gives operators quick headline information about current regional demand.
  * It includes live occupancy and average daily rate data.
  * It also includes mock cards for booking window, average stay and staffing pressure.

* Visitor Spending:

  * This section shows how visitor activity may connect to business activity.
  * For the MVP, these values are mock examples until the spend API endpoints are connected.

* Plan Ahead:

  * This section supports future planning by showing recent live occupancy and ADR rows.
  * A simple table is used first so the data can be tested before adding more advanced charts.

The dashboard includes a plain-English insight panel because tourism operators may not interpret raw charts easily. The current version uses fallback text. This can later be replaced by the AI insights endpoint.

---

## Current limitations

The current dashboard is a frontend MVP and does not yet include full role-based login.

Current limitations:

* The operator user is mocked in the frontend.
* Booking window is not connected to live data yet.
* Average stay is not connected to live data yet.
* Visitor spending is not connected to live data yet.
* Spend categories are not connected to live data yet.
* Staffing pressure is shown as an example derived signal.
* The AI insight panel currently uses fallback wording.
* The time period and spend category filters are visible but not fully connected yet.

---

## Future improvements

Future work could include:

* Replace the mock operator user with real JWT role, region and tier values.
* Connect booking window data.
* Connect average length of stay data.
* Connect spend summary data.
* Connect top spend categories data.
* Add a real staffing pressure calculation.
* Connect the AI insight panel to the shared AI insights endpoint.
* Replace the recent data table with a chart if the team decides to use Vega-Lite or another chart option.
* Lock operator users to their assigned region in the final role-scoped version.
