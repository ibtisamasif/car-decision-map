# Car Decision Map + EMI (Electric & Petrol Edition)

A local, offline-capable web calculator for comparing the true monthly and multi-year cost of owning a car in Pakistan (Fuel/Electricity, Depreciation, Upkeep, EMI, and Opportunity Cost), upgraded so **Your current car** supports both **Petrol** and **Electric (EV)** vehicles.

## Features
- **Current Car EV & Petrol Toggle**: Switch your existing car between **Petrol** (`km per litre`) and **Electric** (`km per unit / kWh`), using either home electricity or solar net-metering rates.
- **Compare up to 4 Candidate Cars**: Mix and match Petrol and Electric options with **Cash** or **EMI** financing.
- **Full 5-Year & Monthly Breakdown**: Includes fuel/charging costs (with optional annual inflation), resale depreciation, opportunity cost of capital tied up in the car (and monthly compounding on EMI instalments), bank markup above price, and annual upkeep.
- **Interactive Distance Crossover Chart**: Visualizes total ownership cost from `0` to `1,000 km/day` and highlights the exact daily mileage where the cheapest car choice switches.

## Run Locally
Serve the static directory with Python's built-in HTTP server:

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

Or

## Run Directly

```bash
https://www.ibtisamasif.com/car-decision-map/
```
