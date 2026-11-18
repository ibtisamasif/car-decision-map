const STORAGE_KEY = "car_decision_calculator_local_v2";

const ACCENTS = {
  keep: { stroke: "#3b82f6", dotClass: "dot-keep", cardClass: "accent-keep" },
  A: { stroke: "#f59e0b", dotClass: "dot-A", cardClass: "accent-A" },
  B: { stroke: "#0d9488", dotClass: "dot-B", cardClass: "accent-B" },
  C: { stroke: "#a855f7", dotClass: "dot-C", cardClass: "accent-C" },
  D: { stroke: "#f43f5e", dotClass: "dot-D", cardClass: "accent-D" },
  E: { stroke: "#06b6d4", dotClass: "dot-E", cardClass: "accent-E" },
  F: { stroke: "#6366f1", dotClass: "dot-F", cardClass: "accent-F" }
};

const CAR_TEMPLATES = {
  A: { fuel: "pet", price: "47,70,000", eff: "15", keep: "75", mnt: "60,000" },
  B: { fuel: "ev", price: "72,90,000", eff: "6.5", keep: "50", mnt: "30,000" },
  C: { fuel: "pet", price: "50,00,000", eff: "15", keep: "75", mnt: "60,000" },
  D: { fuel: "pet", price: "50,00,000", eff: "15", keep: "75", mnt: "60,000" },
  E: { fuel: "ev", price: "55,00,000", eff: "6.5", keep: "75", mnt: "30,000" },
  F: { fuel: "pet", price: "45,00,000", eff: "14", keep: "80", mnt: "50,000" }
};

const PROMPT_EXAMPLE_STATE = {
  mode: "swap",
  km: "50",
  cur: "75,00,000",
  yrs: "5",
  ret: "10",
  pet: "393",
  ele: "27",
  solar: true,
  rise: "0",
  oName: "Oshan",
  oFuel: "pet",
  oEff: "9",
  oKeep: "80",
  oMnt: "1,20,000",
  oMemEff: { pet: "9", ev: "6.5" },
  oMemMnt: { pet: "1,20,000", ev: "30,000" },
  cars: [
    {
      id: "A",
      name: "Chery",
      fuel: "ev",
      price: "58,00,000",
      eff: "7",
      keep: "75",
      pay: "cash",
      up: "",
      inst: "",
      mon: "",
      mnt: "30,000",
      memEff: { pet: "15", ev: "7" },
      memMnt: { pet: "60,000", ev: "30,000" }
    },
    {
      id: "B",
      name: "BYD",
      fuel: "ev",
      price: "76,00,000",
      eff: "6.5",
      keep: "90",
      pay: "cash",
      up: "",
      inst: "",
      mon: "",
      mnt: "30,000",
      memEff: { pet: "15", ev: "6.5" },
      memMnt: { pet: "60,000", ev: "30,000" }
    },
    {
      id: "C",
      name: "Leaf",
      fuel: "ev",
      price: "60,00,000",
      eff: "5",
      keep: "87",
      pay: "cash",
      up: "",
      inst: "",
      mon: "",
      mnt: "2,00,000",
      memEff: { pet: "15", ev: "5" },
      memMnt: { pet: "60,000", ev: "2,00,000" }
    },
    {
      id: "D",
      name: "Alsvin",
      fuel: "pet",
      price: "38,00,000",
      eff: "10",
      keep: "95",
      pay: "cash",
      up: "",
      inst: "",
      mon: "",
      mnt: "80,000",
      memEff: { pet: "10", ev: "6.5" },
      memMnt: { pet: "80,000", ev: "30,000" }
    }
  ]
};

const DEFAULT_STATE = structuredClone(PROMPT_EXAMPLE_STATE);

const FUEL_NOTES = {
  pet: "Your real, everyday figure. Small cars do 14 to 18 in the city, SUVs 8 to 12. Hybrid? Choose petrol.",
  ev: "Real Karachi driving with the AC on: about 6 to 7. Brochures say 8 to 9."
};

const CURRENT_CAR_NOTES = {
  pet: "Use your real, everyday km per litre. Older cars lose less value each year.",
  ev: "Use your real, everyday km per unit (kWh) with AC on. Older cars lose less value each year."
};

// UI state (collapsibles)
let uiState = {
  openUpkeep: { A: true, B: true, C: true, D: true },
  openUnderHood: false,
  openSeeWhy: {},
  savedNonSolarEle: "60",
  hoverPointIndex: null
};

let state = loadState();
let lastCalcResult = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ... structuredClone(DEFAULT_STATE),
        ...parsed,
        oFuel: parsed.oFuel || "ev",
        oMemEff: parsed.oMemEff || { pet: "10", ev: "6.5" },
        oMemMnt: parsed.oMemMnt || { pet: "1,20,000", ev: "30,000" }
      };
    }
  } catch (e) {
    console.warn("Could not read state from localStorage", e);
  }
  return structuredClone(DEFAULT_STATE);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Could not save state", e);
  }
}

// Formatting helpers matching original chunk_589.js
function fmtInt(n) {
  return Number.isFinite(n) ? Math.round(n).toLocaleString("en-IN") : "0";
}

function fmtRs(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1e7) return `${sign}Rs ${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}Rs ${(abs / 1e5).toFixed(abs >= 1e6 ? 1 : 2)} L`;
  return `${sign}Rs ${fmtInt(abs)}`;
}

function fmtShort(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1e7) return `${sign}${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}${(abs / 1e5).toFixed(1)} L`;
  return `${sign}${fmtInt(abs)}`;
}

function fmtWords(n) {
  if (!(n > 0)) return "";
  if (n >= 1e7) return `= ${+(n / 1e7).toFixed(2)} Crore`;
  if (n >= 1e5) return `= ${+(n / 1e5).toFixed(2)} Lakh`;
  return `= Rs ${fmtInt(n)}`;
}

function formatIndianInput(val) {
  const parts = String(val).replace(/[^0-9.]/g, "").split(".");
  const intPart = parts[0].replace(/^0+(?=\d)/, "");
  const decPart = parts.length > 1 ? "." + parts.slice(1).join("").slice(0, 2) : "";
  return (intPart ? Number(intPart).toLocaleString("en-IN") : "") + decPart;
}

function parseNum(val) {
  if (val == null) return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  const n = parseFloat(String(val).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Core Mathematical Engine (Exact match with InvestKaar API + Electric Current Car support)
function calculateDecisionMap(s) {
  const isSwap = s.mode === "swap";
  const km = parseNum(s.km);
  const cur = parseNum(s.cur);
  const yrs = Math.max(1, Math.min(15, Math.round(parseNum(s.yrs) || 5)));
  const r = Math.max(0, Math.min(40, parseNum(s.ret)));
  const rise = Math.max(0, Math.min(40, parseNum(s.rise)));
  const pet = parseNum(s.pet) || 393;
  const ele = parseNum(s.ele) || 60;

  const oFuel = s.oFuel === "ev" ? "ev" : "pet";
  const oEff = parseNum(s.oEff);
  const oKeep = parseNum(s.oKeep);
  const oMnt = parseNum(s.oMnt);
  const oName = (s.oName || "").trim() || "your current car";
  const oShortName = (s.oName || "").trim() || "Current car";

  // Validation lock check
  const missing = [];
  if (km <= 0) missing.push("how far you drive a day");
  if (isSwap) {
    if (cur <= 0) missing.push("what your current car sells for today");
    if (oEff <= 0) missing.push("your current car's mileage");
  }
  s.cars.forEach((c, idx) => {
    const label = c.name?.trim() || `Car ${c.id}`;
    if (parseNum(c.price) <= 0) missing.push(`${label}'s buying price`);
    if (parseNum(c.eff) <= 0) missing.push(`${label}'s mileage`);
    if (c.pay === "emi") {
      if (parseNum(c.up) <= 0 || parseNum(c.inst) <= 0 || parseNum(c.mon) <= 0) {
        missing.push(`${label}'s EMI bank quote (down payment, monthly instalment, and months)`);
      }
    }
  });

  if (missing.length > 0) {
    return {
      locked: true,
      lockMessage: `Please enter ${missing.join(", ")}.`
    };
  }

  const retRate = r / 100;
  const riseRate = rise / 100;
  const compFactor = Math.pow(1 + retRate, yrs) - 1;
  const rMonth = Math.pow(1 + retRate, 1 / 12) - 1;
  const totalMonths = yrs * 12;
  const infMult = riseRate === 0 ? yrs : (Math.pow(1 + riseRate, yrs) - 1) / riseRate;

  function fuelCostForDistance(dailyKm, fuelType, effVal) {
    const unitPrice = fuelType === "ev" ? ele : pet;
    const cpk = effVal > 0 ? unitPrice / effVal : 0;
    return dailyKm * 365 * cpk * infMult;
  }

  // Build entries
  const entries = [];

  if (isSwap) {
    const oUnitPrice = oFuel === "ev" ? ele : pet;
    const oCpk = oEff > 0 ? oUnitPrice / oEff : 0;
    const oFuelTotal = fuelCostForDistance(km, oFuel, oEff);
    const oLost = cur * (1 - oKeep / 100);
    const oMntTotal = oMnt * yrs;
    const oTotal = oFuelTotal + oLost + oMntTotal;
    const oMonth = oTotal / totalMonths;
    const rawMonthlyFuel = km * 30 * oCpk;
    const roundedMonthlyFuel = Math.round(rawMonthlyFuel / 100) * 100;

    entries.push({
      id: "keep",
      name: oShortName,
      tableLabel: (s.oName || "").trim() ? `Keep my ${s.oName.trim()}` : "Keep current car",
      verdictLabel: (s.oName || "").trim() ? `Keep your ${s.oName.trim()}` : "Keep your current car",
      fuel: oFuel,
      cpk: oCpk,
      monthlyFuel: roundedMonthlyFuel,
      yearlyFuel: roundedMonthlyFuel * 12,
      price: null,
      instV: null,
      fuelTotal: oFuelTotal,
      lost: oLost,
      opp: 0,
      bank: 0,
      mntTotal: oMntTotal,
      total: oTotal,
      month: oMonth,
      fixedNonFuel: oLost + oMntTotal,
      eff: oEff
    });
  }

  const baseCap = isSwap ? cur : 0;

  s.cars.forEach((c, idx) => {
    const price = parseNum(c.price);
    const eff = parseNum(c.eff);
    const keep = parseNum(c.keep);
    const mnt = parseNum(c.mnt);
    const up = parseNum(c.up);
    const inst = parseNum(c.inst);
    const mon = Math.round(parseNum(c.mon));
    const unitPrice = c.fuel === "ev" ? ele : pet;
    const cpk = eff > 0 ? unitPrice / eff : 0;

    const fuelTotal = fuelCostForDistance(km, c.fuel, eff);
    const lost = price * (1 - keep / 100);
    const mntTotal = mnt * yrs;

    let opp = 0;
    let bank = 0;
    let instV = null;

    if (c.pay === "emi") {
      const upfrontOpp = (up - baseCap) * compFactor;
      let instOpp = 0;
      const activeMonths = Math.min(mon, totalMonths);
      for (let m = 1; m <= activeMonths; m++) {
        instOpp += inst * (Math.pow(1 + rMonth, totalMonths - m) - 1);
      }
      opp = upfrontOpp + instOpp;
      bank = up + inst * mon - price;
      instV = inst;
    } else {
      opp = (price - baseCap) * compFactor;
      bank = 0;
    }

    const total = fuelTotal + lost + opp + bank + mntTotal;
    const month = total / totalMonths;
    const rawMonthlyFuel = km * 30 * cpk;
    const roundedMonthlyFuel = Math.round(rawMonthlyFuel / 100) * 100;
    const cleanName = (c.name || "").trim() || `Car ${c.id}`;

    entries.push({
      id: c.id,
      name: cleanName,
      tableLabel: cleanName,
      verdictLabel: `Buy ${cleanName}`,
      fuel: c.fuel,
      pay: c.pay,
      cpk,
      monthlyFuel: roundedMonthlyFuel,
      yearlyFuel: roundedMonthlyFuel * 12,
      price,
      instV,
      fuelTotal,
      lost,
      opp,
      bank,
      mntTotal,
      total,
      month,
      fixedNonFuel: lost + opp + bank + mntTotal,
      eff
    });
  });

  // Running costs cards
  const baseEntry = entries[0];
  const runningCosts = entries.map((e, idx) => {
    const perKmText = `Rs ${e.cpk >= 10 ? Math.round(e.cpk) : e.cpk.toFixed(1)} a km`;
    if (isSwap && idx > 0) {
      const diffMonth = baseEntry.monthlyFuel - e.monthlyFuel;
      const diffYear = baseEntry.yearlyFuel - e.yearlyFuel;
      const isSavings = diffMonth > 0 ? true : diffMonth < 0 ? false : null;
      const monthlyDiffText =
        diffMonth > 0
          ? `Saves ${fmtRs(diffMonth)} a month`
          : diffMonth < 0
          ? `Costs ${fmtRs(-diffMonth)} more a month`
          : "Same fuel cost a month";
      const yearlyDiffText =
        diffYear !== 0
          ? `${fmtRs(Math.abs(diffYear))} a year vs current car`
          : "Same yearly fuel cost";
      return {
        id: e.id,
        name: e.name,
        cpk: e.cpk,
        perKmText,
        monthlyCost: e.monthlyFuel,
        yearlyCost: e.yearlyFuel,
        monthlyDiffText,
        yearlyDiffText,
        isSavings
      };
    }
    return {
      id: e.id,
      name: e.name,
      cpk: e.cpk,
      perKmText,
      monthlyCost: e.monthlyFuel,
      yearlyCost: e.yearlyFuel
    };
  });

  // Comparisons vs baseEntry (keep in swap mode, Car A in extra mode)
  const comparisons = entries.slice(1).map((e) => {
    const fuelDelta = baseEntry.fuelTotal - e.fuelTotal;
    const moneyDelta = (baseEntry.opp + baseEntry.bank) - (e.opp + e.bank);
    const lostDelta = baseEntry.lost - e.lost;
    const mntDelta = baseEntry.mntTotal - e.mntTotal;
    const netSavings = baseEntry.total - e.total;

    let moneyDesc = "";
    if (e.pay === "emi") {
      moneyDesc = "Lost return + paid to the bank";
    } else {
      const capDiff = e.price - (isSwap ? cur : baseEntry.price);
      if (capDiff < 0) {
        moneyDesc = `${fmtRs(-capDiff)} less in the car, stays invested at ${r}%`;
      } else if (capDiff > 0) {
        moneyDesc = `${fmtRs(capDiff)} more in the car, at ${r}% a year`;
      } else {
        moneyDesc = "Same money tied up in the car";
      }
    }

    const r1 = fuelDelta;
    const r2 = r1 + moneyDelta;
    const r3 = r2 + lostDelta;
    const r4 = r3 + mntDelta;

    return {
      id: e.id,
      name: e.name,
      netSavings,
      monthRealCost: e.month,
      monthlyInstalment: e.instV,
      lines: [
        {
          title: "Fuel",
          delta: fuelDelta,
          desc: fuelDelta >= 0 ? "Uses less petrol or electricity" : "Uses more petrol or electricity",
          isFuelHighlight: true,
          running: r1
        },
        {
          title: "Money",
          delta: moneyDelta,
          desc: moneyDesc,
          running: r2
        },
        {
          title: "Value lost when you sell",
          delta: lostDelta,
          desc: `Loses ${fmtRs(e.lost)} vs ${fmtRs(baseEntry.lost)}`,
          running: r3
        },
        {
          title: "Repairs and upkeep",
          delta: mntDelta,
          desc: "",
          running: r4
        }
      ]
    };
  });

  // Ranking & Verdict
  const sorted = entries.slice().sort((a, b) => a.total - b.total);
  const winner = sorted[0];
  const yrWord = yrs === 1 ? "year" : "years";

  let verdict = winner.verdictLabel;
  let verdictSub = "";
  if (sorted.length > 1) {
    const second = sorted[1];
    const diffSecond = second.total - winner.total;
    const restParts = sorted.slice(2).map((item) => {
      const d = item.total - winner.total;
      return `${item.tableLabel} costs ${fmtRs(d)} more`;
    });
    verdictSub = `Cheapest over ${yrs} ${yrWord}, by ${fmtRs(diffSecond)} compared with the next best (${second.tableLabel}).${
      restParts.length ? " " + restParts.join(", ") + "." : ""
    }`;
  } else {
    verdictSub = `Total cost of owning over ${yrs} ${yrWord} is ${fmtRs(winner.total)} (${fmtRs(winner.month)} a month).`;
  }

  const anyEmi = s.cars.some((c) => c.pay === "emi");
  let capitalNote = isSwap
    ? `Opportunity cost is what the money in the car (the price minus what your current car sells for) would have earned at ${r}% a year.`
    : `Opportunity cost is what the money in the car would have earned at ${r}% a year.`;
  if (anyEmi) {
    capitalNote += ` On EMI it counts the down payment and each instalment from the day it's paid. Real cost a month is the total spread over the months you keep the car.`;
  }

  const tableColumns = entries.map((e) => ({
    id: e.id,
    label: e.tableLabel,
    isWinner: e.id === winner.id
  }));

  const mapVals = (fn) => {
    const obj = {};
    entries.forEach((e) => {
      obj[e.id] = fn(e);
    });
    return obj;
  };

  const tableRows = [
    { id: "price", label: "Buying price", isHeader: true, values: mapVals((e) => e.price) }
  ];
  if (anyEmi) {
    tableRows.push({
      id: "instV",
      label: "Monthly instalment",
      values: mapVals((e) => e.instV)
    });
  }
  tableRows.push(
    { id: "fuel", label: "Petrol or electricity", values: mapVals((e) => e.fuelTotal) },
    { id: "lost", label: "Value lost when you sell", values: mapVals((e) => e.lost) },
    { id: "opp", label: "Opportunity cost", values: mapVals((e) => e.opp) }
  );
  if (anyEmi) {
    tableRows.push({
      id: "bank",
      label: "Paid to the bank above the price",
      values: mapVals((e) => e.bank)
    });
  }
  tableRows.push(
    { id: "mnt", label: "Repairs and upkeep", values: mapVals((e) => e.mntTotal) },
    { id: "total", label: "Total cost of owning", isTotal: true, values: mapVals((e) => e.total) },
    { id: "month", label: "Real cost a month", isMonthly: true, values: mapVals((e) => e.month) }
  );

  // Chart calculation & crossover switches
  function costAtKm(entry, dKm) {
    return entry.fixedNonFuel + fuelCostForDistance(dKm, entry.fuel, entry.eff);
  }

  function cheapestAtKm(dKm) {
    let best = entries[0];
    let bestCost = costAtKm(best, dKm);
    for (let i = 1; i < entries.length; i++) {
      const c = costAtKm(entries[i], dKm);
      if (c < bestCost) {
        bestCost = c;
        best = entries[i];
      }
    }
    return best;
  }

  const switches = [];
  let prevBest = cheapestAtKm(0);
  for (let d = 1; d <= 1000; d++) {
    const curBest = cheapestAtKm(d);
    if (curBest.id !== prevBest.id) {
      switches.push({ km: d, from: prevBest.id, fromName: prevBest.tableLabel, to: curBest.id, toName: curBest.tableLabel });
      prevBest = curBest;
    }
  }

  const maxSwitchKm = switches.length ? switches[switches.length - 1].km : 0;
  let xmax = 200;
  const targetMax = Math.max(km * 1.6, maxSwitchKm * 1.25);
  if (targetMax > 200) {
    xmax = Math.min(1000, Math.ceil(targetMax / 50) * 50);
  }

  const points = [];
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const dKm = Math.round((i / steps) * xmax);
    const costs = {};
    entries.forEach((e) => {
      costs[e.id] = Math.round(costAtKm(e, dKm));
    });
    points.push({ km: dKm, costs });
  }

  let narrative = "";
  if (switches.length === 0) {
    narrative = `${ prevBest.tableLabel } is the cheapest at every distance up to 1,000 km a day. You drive ${fmtInt(km)} km.`;
  } else if (switches.length === 1) {
    const sw = switches[0];
    const firstWinner = cheapestAtKm(0);
    narrative = `Up to ${fmtInt(sw.km - 1)} km a day, ${firstWinner.tableLabel} is cheapest. From ${fmtInt(sw.km)} km, ${sw.toName}. You drive ${fmtInt(km)} km.`;
  } else {
    const parts = [];
    let start = 0;
    let curW = cheapestAtKm(0);
    switches.forEach((sw) => {
      parts.push(`${start}–${sw.km - 1} km: ${curW.tableLabel}`);
      start = sw.km;
      curW = entries.find((e) => e.id === sw.to) || curW;
    });
    parts.push(`${start}+ km: ${curW.tableLabel}`);
    narrative = `Cheapest by daily distance — ${parts.join(" · ")}. You drive ${fmtInt(km)} km.`;
  }

  return {
    locked: false,
    yrs,
    runningCosts,
    comparisons,
    verdict,
    verdictSub,
    capitalNote,
    tableColumns,
    tableRows,
    chart: {
      xmax,
      userKm: km,
      switches,
      points,
      narrative
    }
  };
}

// Render functions
function renderCurrentCarCard() {
  const curVal = parseNum(state.cur);
  const keepRatio = parseNum(state.oKeep) / 100;
  const mntVal = parseNum(state.oMnt);
  const yrs = Math.max(1, Math.round(parseNum(state.yrs) || 5));
  const worthAfter = curVal * keepRatio;
  const dropVal = curVal - worthAfter;
  const isEv = state.oFuel === "ev";
  const upkeepOpen = !!uiState.openUpkeep["keep"];

  return `
    <div class="car-card accent-keep">
      <div style="display:flex; flex-direction:column; gap:0.875rem;">
        <div class="card-header">
          <div class="card-tag">
            <span class="dot dot-keep"></span>
            <span>Your current car</span>
          </div>
        </div>

        <div>
          <label for="cur-name" class="visually-hidden">Current car name</label>
          <input
            id="cur-name"
            type="text"
            class="name-input"
            placeholder="Name (optional), e.g. Corolla or Atto 3"
            value="${escapeHtml(state.oName)}"
            data-bind="oName"
          />
        </div>

        <div class="segmented" role="group" aria-label="Current car fuel type">
          <button
            type="button"
            class="seg-btn ${!isEv ? "active" : ""}"
            data-action="set-current-fuel"
            data-fuel="pet"
          >Petrol</button>
          <button
            type="button"
            class="seg-btn ${isEv ? "active" : ""}"
            data-action="set-current-fuel"
            data-fuel="ev"
          >Electric</button>
        </div>

        <div>
          <label class="field-label" for="cur-val">Sells for today</label>
          <div class="input-group">
            <span class="input-prefix">Rs</span>
            <input
              id="cur-val"
              type="text"
              inputmode="numeric"
              class="field-input"
              placeholder="22,00,000"
              value="${escapeHtml(state.cur)}"
              data-bind-currency="cur"
            />
          </div>
          <div class="helper-value" id="helper-cur-words">${curVal > 0 ? fmtWords(curVal) : ""}</div>
        </div>

        <div class="two-col">
          <div>
            <label class="field-label" for="cur-eff">${isEv ? "Km per unit" : "Km per litre"}</label>
            <div class="input-group">
              <span class="input-prefix">km</span>
              <input
                id="cur-eff"
                type="text"
                inputmode="decimal"
                class="field-input text-center"
                placeholder="${isEv ? "6.5" : "10"}"
                value="${escapeHtml(state.oEff)}"
                data-bind-decimal="oEff"
              />
            </div>
          </div>
          <div>
            <label class="field-label" for="cur-keep">Resale value</label>
            <div class="input-group">
              <span class="input-prefix">%</span>
              <input
                id="cur-keep"
                type="text"
                inputmode="decimal"
                class="field-input text-center"
                placeholder="77"
                value="${escapeHtml(state.oKeep)}"
                data-bind-decimal="oKeep"
              />
            </div>
          </div>
        </div>

        <div class="helper-value" id="helper-cur-resale">
          ${
            curVal > 0 && keepRatio > 0
              ? `Worth ${fmtRs(worthAfter)} after ${yrs} ${yrs === 1 ? "year" : "years"} (${Math.round(
                  keepRatio * 100
                )}% of today's value), ${
                  dropVal >= 0 ? `a drop of ${fmtRs(dropVal)}` : `a gain of ${fmtRs(-dropVal)}`
                }`
              : ""
          }
        </div>

        <p class="helper-note">${CURRENT_CAR_NOTES[isEv ? "ev" : "pet"]}</p>

        <div class="collapsible-section">
          <button
            type="button"
            class="collapsible-trigger"
            aria-expanded="${upkeepOpen}"
            data-action="toggle-upkeep"
            data-id="keep"
          >
            <svg class="chevron ${upkeepOpen ? "open" : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
            <span>Upkeep</span>
            <span class="sub" id="helper-cur-mnt-year">${fmtRs(mntVal)} a year</span>
          </button>
          ${
            upkeepOpen
              ? `
            <div style="padding-top:0.5rem; display:flex; flex-direction:column; gap:0.375rem;">
              <label class="field-label" for="cur-mnt">Repairs and upkeep, a year</label>
              <div class="input-group">
                <span class="input-prefix">Rs</span>
                <input
                  id="cur-mnt"
                  type="text"
                  inputmode="numeric"
                  class="field-input"
                  placeholder="${isEv ? "30,000" : "1,20,000"}"
                  value="${escapeHtml(state.oMnt)}"
                  data-bind-currency="oMnt"
                />
              </div>
              <p class="helper-note" id="helper-cur-mnt-month">= ${fmtRs(mntVal / 12)} a month. An older car usually costs more to keep running.</p>
            </div>
          `
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

function renderCandidateCarCard(car, index, totalCarsCount) {
  const rankLabel = ["1st", "2nd", "3rd", "4th", "5th", "6th"][index] || `${index + 1}th`;
  const priceVal = parseNum(car.price);
  const keepRatio = parseNum(car.keep) / 100;
  const mntVal = parseNum(car.mnt);
  const yrs = Math.max(1, Math.round(parseNum(state.yrs) || 5));
  const worthAfter = priceVal * keepRatio;
  const dropVal = priceVal - worthAfter;
  const upVal = parseNum(car.up);
  const instVal = parseNum(car.inst);
  const monVal = parseNum(car.mon);
  const totalEmiPaid = upVal + instVal * monVal;
  const extraBank = totalEmiPaid - priceVal;
  const isEv = car.fuel === "ev";
  const upkeepOpen = !!uiState.openUpkeep[car.id];

  return `
    <div class="car-card accent-${car.id}">
      <div style="display:flex; flex-direction:column; gap:0.875rem;">
        <div class="card-header">
          <div class="card-tag">
            <span class="dot dot-${car.id}"></span>
            <span>Car ${car.id} · ${rankLabel} choice</span>
          </div>
          ${
            totalCarsCount > 1
              ? `<button type="button" class="remove-btn" data-action="remove-car" data-car-id="${car.id}">Remove</button>`
              : ""
          }
        </div>

        <div>
          <label for="name-${car.id}" class="visually-hidden">Car ${car.id} name</label>
          <input
            id="name-${car.id}"
            type="text"
            class="name-input"
            placeholder="Name (optional), e.g. the model"
            value="${escapeHtml(car.name)}"
            data-car-id="${car.id}"
            data-car-field="name"
          />
        </div>

        <div class="segmented" role="group" aria-label="Car ${car.id} fuel type">
          <button
            type="button"
            class="seg-btn ${!isEv ? "active" : ""}"
            data-action="set-car-fuel"
            data-car-id="${car.id}"
            data-fuel="pet"
          >Petrol</button>
          <button
            type="button"
            class="seg-btn ${isEv ? "active" : ""}"
            data-action="set-car-fuel"
            data-car-id="${car.id}"
            data-fuel="ev"
          >Electric</button>
        </div>

        <div>
          <label class="field-label" for="price-${car.id}">Buying price</label>
          <div class="input-group">
            <span class="input-prefix">Rs</span>
            <input
              id="price-${car.id}"
              type="text"
              inputmode="numeric"
              class="field-input"
              placeholder="47,70,000"
              value="${escapeHtml(car.price)}"
              data-car-id="${car.id}"
              data-car-currency="price"
            />
          </div>
          <div class="helper-value" id="helper-price-${car.id}">${priceVal > 0 ? fmtWords(priceVal) : ""}</div>
          <p class="helper-note">Paying cash? Add the insurance or takaful you'll pay.</p>
        </div>

        <div class="two-col">
          <div>
            <label class="field-label" for="eff-${car.id}">${isEv ? "Km per unit" : "Km per litre"}</label>
            <div class="input-group">
              <span class="input-prefix">km</span>
              <input
                id="eff-${car.id}"
                type="text"
                inputmode="decimal"
                class="field-input text-center"
                placeholder="${isEv ? "6.5" : "15"}"
                value="${escapeHtml(car.eff)}"
                data-car-id="${car.id}"
                data-car-decimal="eff"
              />
            </div>
          </div>
          <div>
            <label class="field-label" for="keep-${car.id}">Resale value</label>
            <div class="input-group">
              <span class="input-prefix">%</span>
              <input
                id="keep-${car.id}"
                type="text"
                inputmode="decimal"
                class="field-input text-center"
                placeholder="75"
                value="${escapeHtml(car.keep)}"
                data-car-id="${car.id}"
                data-car-decimal="keep"
              />
            </div>
          </div>
        </div>

        <div class="helper-value" id="helper-resale-${car.id}">
          ${
            priceVal > 0 && keepRatio > 0
              ? `Worth ${fmtRs(worthAfter)} after ${yrs} ${yrs === 1 ? "year" : "years"} (${Math.round(
                  keepRatio * 100
                )}% of price), ${
                  dropVal >= 0 ? `a drop of ${fmtRs(dropVal)}` : `a gain of ${fmtRs(-dropVal)}`
                }`
              : ""
          }
        </div>

        <p class="helper-note">${FUEL_NOTES[car.fuel]}</p>

        <div>
          <span class="field-label">Paying</span>
          <div class="segmented" role="group" aria-label="Car ${car.id} payment method">
            <button
              type="button"
              class="seg-btn ${car.pay === "cash" ? "active" : ""}"
              data-action="set-car-pay"
              data-car-id="${car.id}"
              data-pay="cash"
            >Cash</button>
            <button
              type="button"
              class="seg-btn ${car.pay === "emi" ? "active" : ""}"
              data-action="set-car-pay"
              data-car-id="${car.id}"
              data-pay="emi"
            >EMI</button>
          </div>
        </div>

        ${
          car.pay === "emi"
            ? `
          <div class="emi-box">
            <div>
              <label class="field-label" for="up-${car.id}">Down payment / security deposit</label>
              <div class="input-group">
                <span class="input-prefix">Rs</span>
                <input
                  id="up-${car.id}"
                  type="text"
                  inputmode="numeric"
                  class="field-input"
                  placeholder="15,00,000"
                  value="${escapeHtml(car.up)}"
                  data-car-id="${car.id}"
                  data-car-currency="up"
                />
              </div>
              <div class="helper-value" id="helper-up-${car.id}">${upVal > 0 ? fmtWords(upVal) : ""}</div>
              <p class="helper-note">The total upfront on your bank quote.</p>
            </div>

            <div>
              <label class="field-label" for="inst-${car.id}">Monthly instalment / rent</label>
              <div class="input-group">
                <span class="input-prefix">Rs</span>
                <input
                  id="inst-${car.id}"
                  type="text"
                  inputmode="numeric"
                  class="field-input"
                  placeholder="95,000"
                  value="${escapeHtml(car.inst)}"
                  data-car-id="${car.id}"
                  data-car-currency="inst"
                />
              </div>
              <div class="helper-value" id="helper-inst-${car.id}">${instVal > 0 ? fmtWords(instVal) : ""}</div>
            </div>

            <div>
              <label class="field-label" for="mon-${car.id}">Number of months</label>
              <div class="input-group">
                <input
                  id="mon-${car.id}"
                  type="text"
                  inputmode="numeric"
                  class="field-input text-center"
                  placeholder="60"
                  value="${escapeHtml(car.mon)}"
                  data-car-id="${car.id}"
                  data-car-int="mon"
                />
                <span class="input-suffix">mo</span>
              </div>
            </div>

            <div class="emi-summary" id="helper-emi-summary-${car.id}">
              ${
                upVal > 0 && instVal > 0 && monVal > 0
                  ? `You pay <b>${fmtRs(totalEmiPaid)}</b> in total: ${fmtRs(upVal)} upfront + ${fmtRs(
                      instVal
                    )} × ${monVal} months.${
                      extraBank > 0 ? ` That's <b>${fmtRs(extraBank)}</b> more than the price.` : ""
                    }`
                  : "Fill in all three from your bank quote to see the results."
              }
            </div>
          </div>
        `
            : ""
        }

        <div class="collapsible-section">
          <button
            type="button"
            class="collapsible-trigger"
            aria-expanded="${upkeepOpen}"
            data-action="toggle-upkeep"
            data-id="${car.id}"
          >
            <svg class="chevron ${upkeepOpen ? "open" : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
            <span>Upkeep</span>
            <span class="sub" id="helper-mnt-year-${car.id}">${fmtRs(mntVal)} a year</span>
          </button>
          ${
            upkeepOpen
              ? `
            <div style="padding-top:0.5rem; display:flex; flex-direction:column; gap:0.375rem;">
              <label class="field-label" for="mnt-${car.id}">Repairs and upkeep, a year</label>
              <div class="input-group">
                <span class="input-prefix">Rs</span>
                <input
                  id="mnt-${car.id}"
                  type="text"
                  inputmode="numeric"
                  class="field-input"
                  placeholder="${isEv ? "30,000" : "60,000"}"
                  value="${escapeHtml(car.mnt)}"
                  data-car-id="${car.id}"
                  data-car-currency="mnt"
                />
              </div>
              <p class="helper-note" id="helper-mnt-month-${car.id}">= ${fmtRs(mntVal / 12)} a month.</p>
            </div>
          `
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

function renderFormsSection() {
  const isSwap = state.mode === "swap";
  const kmVal = parseNum(state.km);
  const yrs = Math.max(1, Math.min(15, Math.round(parseNum(state.yrs) || 5)));
  const ret = Math.max(0, Math.min(40, parseNum(state.ret)));
  const rise = Math.max(0, Math.min(40, parseNum(state.rise)));

  const root = document.getElementById("inputs-root");
  root.innerHTML = `
    <section style="display:flex; flex-direction:column; gap:1rem;">
      <div>
        <h2 class="section-title">Your situation</h2>
        <p class="section-sub">
          ${
            isSwap
              ? "You sell your current car and buy another. Or you keep it."
              : "You don't have a car to sell. Every car is compared with your 1st choice."
          }
        </p>
      </div>

      <div class="segmented segmented-mode" role="group" aria-label="Buying situation">
        <button
          type="button"
          class="seg-btn ${isSwap ? "active" : ""}"
          data-action="set-mode"
          data-mode="swap"
        >I'm replacing a car</button>
        <button
          type="button"
          class="seg-btn ${!isSwap ? "active" : ""}"
          data-action="set-mode"
          data-mode="extra"
        >I'm buying a car</button>
      </div>

      <div class="cars-grid">
        ${isSwap ? renderCurrentCarCard() : ""}
        ${state.cars.map((c, idx) => renderCandidateCarCard(c, idx, state.cars.length)).join("")}
        ${
          state.cars.length < 6
            ? `
          <button type="button" class="add-car-btn" data-action="add-car">
            <div class="add-car-icon">+</div>
            <span style="font-size:0.9rem; font-weight:700;">Add a car</span>
            <span style="font-size:0.75rem; color:var(--muted-fg);">Compare up to 6 choices · ${6 - state.cars.length} more left</span>
          </button>
        `
            : ""
        }
      </div>
    </section>

    <section class="panel">
      <h2 class="section-title" style="font-size:1.25rem;">Your driving and fuel</h2>
      <div class="three-col">
        <div>
          <label class="field-label" for="km-input">How far you drive a day</label>
          <div class="stepper">
            <button type="button" class="step-btn" aria-label="Less" data-action="step-km" data-delta="-5">−</button>
            <div class="step-center">
              <input
                id="km-input"
                type="text"
                inputmode="numeric"
                class="field-input text-center"
                placeholder="70"
                value="${escapeHtml(state.km)}"
                data-bind-int="km"
              />
              <span class="step-unit">km</span>
            </div>
            <button type="button" class="step-btn" aria-label="More" data-action="step-km" data-delta="5">+</button>
          </div>
          <div class="helper-value" id="helper-km-month">${kmVal > 0 ? `= ${fmtInt(kmVal * 30)} km a month` : ""}</div>
        </div>

        <div>
          <label class="field-label" for="pet-input">Petrol, per litre</label>
          <div class="input-group">
            <span class="input-prefix">Rs</span>
            <input
              id="pet-input"
              type="text"
              inputmode="decimal"
              class="field-input"
              placeholder="393"
              value="${escapeHtml(state.pet)}"
              data-bind-decimal="pet"
            />
          </div>
        </div>

        <div>
          <label class="field-label" for="ele-input">${state.solar ? "Net metering unit price" : "Electricity at home, per unit"}</label>
          <div class="input-group">
            <span class="input-prefix">Rs</span>
            <input
              id="ele-input"
              type="text"
              inputmode="decimal"
              class="field-input"
              placeholder="60"
              value="${escapeHtml(state.ele)}"
              data-bind-decimal="ele"
            />
          </div>
          <label class="checkbox-row" for="solar-chk">
            <input
              id="solar-chk"
              type="checkbox"
              ${state.solar ? "checked" : ""}
              data-action="toggle-solar"
            />
            <span>I charge from solar</span>
          </label>
          ${
            state.solar
              ? `<p class="helper-note">Each unit the car uses is a unit you don't sell to the grid. New solar users get about Rs 8 to 11 a unit.</p>`
              : ""
          }
        </div>
      </div>
    </section>

    <section class="panel" style="padding:0; overflow:hidden;">
      <button
        type="button"
        class="comparison-header"
        style="padding:1.15rem 1.375rem;"
        aria-expanded="${uiState.openUnderHood}"
        data-action="toggle-under-hood"
      >
        <div>
          <span style="font-size:0.92rem; font-weight:700; display:block;">Under the hood numbers</span>
          <span id="helper-hood-summary" style="font-size:0.78rem; color:var(--muted-fg); margin-top:0.2rem; display:block;">
            ${yrs} ${yrs === 1 ? "year" : "years"} · money earns ${ret.toFixed(1)}% after tax · prices rise ${rise.toFixed(1)}% a year
          </span>
        </div>
        <svg class="chevron ${uiState.openUnderHood ? "open" : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
      </button>
      ${
        uiState.openUnderHood
          ? `
        <div style="border-top:1px solid var(--border); padding:1.25rem 1.375rem; display:flex; flex-direction:column; gap:1rem;">
          <div class="three-col">
            <div>
              <label class="field-label" for="yrs-input">Time you intend to keep the car</label>
              <div class="stepper">
                <button type="button" class="step-btn" aria-label="Less" data-action="step-hood" data-field="yrs" data-delta="-1" data-min="1" data-max="15">−</button>
                <div class="step-center">
                  <input
                    id="yrs-input"
                    type="text"
                    inputmode="numeric"
                    class="field-input text-center"
                    placeholder="5"
                    value="${escapeHtml(state.yrs)}"
                    data-bind-int="yrs"
                  />
                  <span class="step-unit">years</span>
                </div>
                <button type="button" class="step-btn" aria-label="More" data-action="step-hood" data-field="yrs" data-delta="1" data-min="1" data-max="15">+</button>
              </div>
            </div>

            <div>
              <label class="field-label" for="ret-input">What your money earns if it stays invested</label>
              <div class="stepper">
                <button type="button" class="step-btn" aria-label="Less" data-action="step-hood" data-field="ret" data-delta="-1" data-min="0" data-max="40">−</button>
                <div class="step-center">
                  <input
                    id="ret-input"
                    type="text"
                    inputmode="decimal"
                    class="field-input text-center"
                    placeholder="10"
                    value="${escapeHtml(state.ret)}"
                    data-bind-decimal="ret"
                  />
                  <span class="step-unit">% a year</span>
                </div>
                <button type="button" class="step-btn" aria-label="More" data-action="step-hood" data-field="ret" data-delta="1" data-min="0" data-max="40">+</button>
              </div>
              <p class="helper-note">After-tax return. Taking a car loan? Use your loan's interest rate instead.</p>
            </div>

            <div>
              <label class="field-label" for="rise-input">Petrol and electricity prices rise each year by</label>
              <div class="stepper">
                <button type="button" class="step-btn" aria-label="Less" data-action="step-hood" data-field="rise" data-delta="-1" data-min="0" data-max="40">−</button>
                <div class="step-center">
                  <input
                    id="rise-input"
                    type="text"
                    inputmode="decimal"
                    class="field-input text-center"
                    placeholder="0"
                    value="${escapeHtml(state.rise)}"
                    data-bind-decimal="rise"
                  />
                  <span class="step-unit">% a year</span>
                </div>
                <button type="button" class="step-btn" aria-label="More" data-action="step-hood" data-field="rise" data-delta="1" data-min="0" data-max="40">+</button>
              </div>
              <p class="helper-note">0% keeps today's prices for every year.</p>
            </div>
          </div>
          <p class="helper-note" style="border-top:1px solid var(--border); padding-top:0.75rem;">
            Put in the real price and mileage of the car you are currently driving or looking at.
          </p>
        </div>
      `
          : ""
      }
    </section>
  `;
}

function updateInlineHelpers() {
  const yrs = Math.max(1, Math.min(15, Math.round(parseNum(state.yrs) || 5)));
  const ret = Math.max(0, Math.min(40, parseNum(state.ret)));
  const rise = Math.max(0, Math.min(40, parseNum(state.rise)));

  const curWordsEl = document.getElementById("helper-cur-words");
  const curVal = parseNum(state.cur);
  if (curWordsEl) curWordsEl.textContent = curVal > 0 ? fmtWords(curVal) : "";

  const curResaleEl = document.getElementById("helper-cur-resale");
  const keepRatio = parseNum(state.oKeep) / 100;
  if (curResaleEl) {
    const worthAfter = curVal * keepRatio;
    const dropVal = curVal - worthAfter;
    curResaleEl.textContent =
      curVal > 0 && keepRatio > 0
        ? `Worth ${fmtRs(worthAfter)} after ${yrs} ${yrs === 1 ? "year" : "years"} (${Math.round(
            keepRatio * 100
          )}% of today's value), ${
            dropVal >= 0 ? `a drop of ${fmtRs(dropVal)}` : `a gain of ${fmtRs(-dropVal)}`
          }`
        : "";
  }

  const curMntVal = parseNum(state.oMnt);
  const curMntYrEl = document.getElementById("helper-cur-mnt-year");
  if (curMntYrEl) curMntYrEl.textContent = `${fmtRs(curMntVal)} a year`;
  const curMntMoEl = document.getElementById("helper-cur-mnt-month");
  if (curMntMoEl) {
    curMntMoEl.textContent = `= ${fmtRs(curMntVal / 12)} a month. An older car usually costs more to keep running.`;
  }

  state.cars.forEach((car) => {
    const pVal = parseNum(car.price);
    const kRatio = parseNum(car.keep) / 100;
    const mVal = parseNum(car.mnt);
    const pEl = document.getElementById(`helper-price-${car.id}`);
    if (pEl) pEl.textContent = pVal > 0 ? fmtWords(pVal) : "";

    const rEl = document.getElementById(`helper-resale-${car.id}`);
    if (rEl) {
      const worth = pVal * kRatio;
      const drop = pVal - worth;
      rEl.textContent =
        pVal > 0 && kRatio > 0
          ? `Worth ${fmtRs(worth)} after ${yrs} ${yrs === 1 ? "year" : "years"} (${Math.round(
              kRatio * 100
            )}% of price), ${drop >= 0 ? `a drop of ${fmtRs(drop)}` : `a gain of ${fmtRs(-drop)}`}`
          : "";
    }

    const mYrEl = document.getElementById(`helper-mnt-year-${car.id}`);
    if (mYrEl) mYrEl.textContent = `${fmtRs(mVal)} a year`;
    const mMoEl = document.getElementById(`helper-mnt-month-${car.id}`);
    if (mMoEl) mMoEl.textContent = `= ${fmtRs(mVal / 12)} a month.`;

    if (car.pay === "emi") {
      const upVal = parseNum(car.up);
      const instVal = parseNum(car.inst);
      const monVal = parseNum(car.mon);
      const upEl = document.getElementById(`helper-up-${car.id}`);
      if (upEl) upEl.textContent = upVal > 0 ? fmtWords(upVal) : "";
      const instEl = document.getElementById(`helper-inst-${car.id}`);
      if (instEl) instEl.textContent = instVal > 0 ? fmtWords(instVal) : "";
      const sumEl = document.getElementById(`helper-emi-summary-${car.id}`);
      if (sumEl) {
        const totalPaid = upVal + instVal * monVal;
        const extra = totalPaid - pVal;
        sumEl.innerHTML =
          upVal > 0 && instVal > 0 && monVal > 0
            ? `You pay <b>${fmtRs(totalPaid)}</b> in total: ${fmtRs(upVal)} upfront + ${fmtRs(
                instVal
              )} × ${monVal} months.${extra > 0 ? ` That's <b>${fmtRs(extra)}</b> more than the price.` : ""}`
            : "Fill in all three from your bank quote to see the results.";
      }
    }
  });

  const kmMonthEl = document.getElementById("helper-km-month");
  const kmVal = parseNum(state.km);
  if (kmMonthEl) kmMonthEl.textContent = kmVal > 0 ? `= ${fmtInt(kmVal * 30)} km a month` : "";

  const hoodSummaryEl = document.getElementById("helper-hood-summary");
  if (hoodSummaryEl) {
    hoodSummaryEl.textContent = `${yrs} ${yrs === 1 ? "year" : "years"} · money earns ${ret.toFixed(
      1
    )}% after tax · prices rise ${rise.toFixed(1)}% a year`;
  }
}

function renderResults() {
  const res = calculateDecisionMap(state);
  lastCalcResult = res;
  const out = document.getElementById("results-root");

  if (res.locked) {
    out.innerHTML = `
      <div class="alert-locked">
        <div style="font-weight:700;">Fill in your numbers to see the answers</div>
        <div style="margin-top:0.25rem; font-size:0.8rem;">${escapeHtml(res.lockMessage)}</div>
      </div>
    `;
    return;
  }

  const yrs = res.yrs;
  const yrWord = yrs === 1 ? "year" : "years";
  const isSwap = state.mode === "swap";
  const baseName = isSwap
    ? (state.oName || "").trim() || "your current car"
    : (state.cars[0]?.name || "").trim() || "your 1st choice";
  const userKm = parseNum(state.km);

  // 0. Running cost, fuel only
  const runningHtml = `
    <section class="panel">
      <div>
        <h2 class="section-title" style="font-size:1.25rem;">Running cost, fuel only</h2>
        <p class="section-sub">
          Today's ${state.solar ? "petrol price and net metering rate" : "petrol and electricity prices"} ÷ each car's mileage. No price rise, upkeep or depreciation yet.
        </p>
      </div>
      <div class="running-grid">
        ${res.runningCosts
          .map((rc) => {
            const hasDiff = rc.monthlyDiffText !== undefined;
            const diffClass =
              rc.isSavings === true ? "text-primary" : rc.isSavings === false ? "text-destructive" : "";
            return `
            <div class="running-card accent-${rc.id}">
              <div style="display:flex; align-items:center; gap:0.375rem; font-size:0.75rem; font-weight:600; color:var(--muted-fg);">
                <span class="dot dot-${rc.id}" style="width:0.5rem; height:0.5rem;"></span>
                <span>${escapeHtml(rc.name)}</span>
              </div>
              ${
                hasDiff
                  ? `
                <div class="running-big ${diffClass}">${escapeHtml(rc.monthlyDiffText)}</div>
                <div style="font-size:0.75rem; color:var(--muted-fg); font-weight:500;">${escapeHtml(
                  rc.yearlyDiffText
                )}</div>
                <div style="font-size:0.75rem; color:var(--muted-fg); padding-top:0.15rem;">
                  Runs at ${escapeHtml(rc.perKmText)} · ${fmtRs(rc.monthlyCost)} a month
                </div>
              `
                  : `
                <div class="running-big">${escapeHtml(rc.perKmText)}</div>
                <div style="font-size:0.75rem; color:var(--muted-fg);">
                  ${fmtRs(rc.monthlyCost)} a month at ${fmtInt(userKm)} km a day
                </div>
                <div style="font-size:0.75rem; color:var(--muted-fg);">
                  ${fmtRs(rc.yearlyCost)} a year
                </div>
              `
              }
            </div>
          `;
          })
          .join("")}
      </div>
    </section>
  `;

  // 1. Compared with keeping current car
  const comparisonsHtml = `
    <section class="panel">
      <div style="display:flex; align-items:flex-start; gap:0.75rem;">
        <span class="step-number">1</span>
        <div>
          <h2 class="section-title" style="font-size:1.25rem;">
            ${isSwap ? `Compared with keeping ${escapeHtml(baseName)}` : `Compared with your 1st choice (${escapeHtml(baseName)})`}
          </h2>
          <p class="section-sub">
            ${
              res.comparisons.length > 0
                ? `Over ${yrs} ${yrWord}. Tap "See why" to see how each number builds up.`
                : `Add another car with the + button to compare it with your 1st choice.`
            }
          </p>
        </div>
      </div>
      ${
        res.comparisons.length > 0
          ? `
        <div style="display:flex; flex-direction:column; gap:0.75rem;">
          ${res.comparisons
            .map((comp) => {
              const isSave = comp.netSavings >= 0;
              const isOpen = !!uiState.openSeeWhy[comp.id];
              return `
              <div class="comparison-card accent-${comp.id}">
                <button
                  type="button"
                  class="comparison-header"
                  aria-expanded="${isOpen}"
                  data-action="toggle-see-why"
                  data-id="${comp.id}"
                >
                  <div>
                    <div style="font-size:1rem; font-weight:700;">
                      ${escapeHtml(comp.name)}
                      <span class="${isSave ? "text-primary" : "text-destructive"}">
                        ${isSave ? `saves ${fmtRs(comp.netSavings)}` : `costs ${fmtRs(-comp.netSavings)} more`}
                      </span>
                      over ${yrs} ${yrWord}
                    </div>
                    <div style="font-size:0.75rem; color:var(--muted-fg); margin-top:0.2rem;">
                      Real cost ${fmtRs(comp.monthRealCost)} a month${
                comp.monthlyInstalment ? ` · instalment ${fmtRs(comp.monthlyInstalment)}` : ""
              }
                    </div>
                  </div>
                  <div style="display:flex; align-items:center; gap:0.25rem; font-size:0.75rem; font-weight:700; color:var(--primary); flex-shrink:0; margin-left:0.75rem;">
                    <span>See why</span>
                    <svg class="chevron ${isOpen ? "open" : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                </button>
                ${
                  isOpen
                    ? `
                  <div class="comparison-details">
                    <div class="comp-row" style="font-size:0.68rem; font-weight:700; text-transform:uppercase; color:var(--muted-fg);">
                      <div></div>
                      <div style="text-align:right;">This line</div>
                      <div style="text-align:right;">Running total</div>
                    </div>
                    ${comp.lines
                      .map((ln) => {
                        const dPos = ln.delta >= 0;
                        const rPos = ln.running >= 0;
                        return `
                        <div class="comp-row">
                          <div>
                            <div style="font-weight:600; color:var(--fg);">${escapeHtml(ln.title)}</div>
                            ${
                              ln.desc
                                ? `<div style="font-size:0.7rem; color:var(--muted-fg);">${escapeHtml(ln.desc)}</div>`
                                : ""
                            }
                            ${
                              ln.isFuelHighlight
                                ? `<div style="font-size:0.65rem; font-style:italic; color:var(--muted-fg);">Where most people stop</div>`
                                : ""
                            }
                          </div>
                          <div class="${dPos ? "text-primary" : "text-destructive"}" style="text-align:right; font-weight:700; font-size:0.9rem; font-variant-numeric:tabular-nums;">
                            ${dPos ? "+" : "−"}${fmtRs(Math.abs(ln.delta))}
                          </div>
                          <div class="${rPos ? "text-primary" : "text-destructive"}" style="text-align:right; font-weight:700; font-size:0.8rem; font-variant-numeric:tabular-nums;">
                            ${rPos ? "+" : "−"}${fmtRs(Math.abs(ln.running))}
                          </div>
                        </div>
                      `;
                      })
                      .join("")}
                    <div class="comp-row" style="font-weight:700; font-size:0.875rem; border-top:2px solid var(--border); padding-top:0.625rem;">
                      <div>${isSave ? "Saves" : "Costs more"}</div>
                      <div></div>
                      <div class="${isSave ? "text-primary" : "text-destructive"}" style="text-align:right; font-variant-numeric:tabular-nums;">
                        ${fmtRs(Math.abs(comp.netSavings))}
                      </div>
                    </div>
                  </div>
                `
                    : ""
                }
              </div>
            `;
            })
            .join("")}
        </div>
      `
          : ""
      }
    </section>
  `;

  // 2. Full cost of each car (Responsive table with sticky headers)
  const fullCostHtml = `
    <section class="panel">
      <div style="display:flex; align-items:flex-start; gap:0.75rem;">
        <span class="step-number">2</span>
        <div>
          <h2 id="full-cost-heading" class="section-title" style="font-size:1.25rem;">Full cost of each car</h2>
          <p class="section-sub">
            The full picture: what you pay over ${yrs} ${yrWord}, including what the car is worth when you sell it.
          </p>
        </div>
      </div>

      <div>
        <div class="verdict-headline">${escapeHtml(res.verdict)}</div>
        <p style="margin:0.4rem 0 0; font-size:0.9rem; color:var(--muted-fg);">${escapeHtml(res.verdictSub)}</p>
      </div>

      <div tabindex="0" role="region" aria-labelledby="full-cost-heading" class="table-wrapper">
        <table class="cost-table">
          <thead>
            <tr>
              <th>Over ${yrs} ${yrWord}</th>
              ${res.tableColumns
                .map(
                  (col) => `
                <th class="${col.isWinner ? "winner-col" : ""}">
                  <div style="display:inline-flex; align-items:center; justify-content:flex-end; gap:0.375rem;">
                    <span class="dot dot-${col.id}"></span>
                    <span>${escapeHtml(col.label)}</span>
                  </div>
                </th>
              `
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${res.tableRows
              .map((row) => {
                const rowClass = row.isTotal
                  ? "row-total"
                  : row.isMonthly
                  ? "row-monthly"
                  : row.isHeader
                  ? "row-header"
                  : "";
                return `
                <tr class="${rowClass}">
                  <th>${escapeHtml(row.label)}</th>
                  ${res.tableColumns
                    .map((col) => {
                      const val = row.values[col.id];
                      const formatted =
                        val == null
                          ? "—"
                          : row.isMonthly || row.id === "instV"
                          ? fmtRs(val)
                          : fmtShort(val);
                      return `<td class="${col.isWinner ? "winner-col" : ""}" data-label="${escapeHtml(
                        col.label
                      )}">${formatted}</td>`;
                    })
                    .join("")}
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>

      <p class="helper-note">${escapeHtml(res.capitalNote)}</p>
    </section>
  `;

  // 3. Chart section
  const chartHtml = renderChartSection(res);

  out.innerHTML = runningHtml + comparisonsHtml + fullCostHtml + chartHtml;
  attachChartEvents();
}

function renderChartSection(res) {
  const { xmax, userKm, switches, points, narrative } = res.chart;
  const cols = res.tableColumns;
  const ids = cols.map((c) => c.id);
  const yrs = res.yrs;
  const yrWord = yrs === 1 ? "year" : "years";

  let minCost = Infinity;
  let maxCost = -Infinity;
  points.forEach((pt) => {
    ids.forEach((id) => {
      const v = pt.costs[id];
      if (v !== undefined) {
        if (v < minCost) minCost = v;
        if (v > maxCost) maxCost = v;
      }
    });
  });
  if (!Number.isFinite(minCost) || !Number.isFinite(maxCost)) {
    minCost = 0;
    maxCost = 1e6;
  }
  if (maxCost - minCost < 1) maxCost = minCost + 1;

  const rawStep = (maxCost - minCost) / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const tickStep = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(minCost / tickStep) * tickStep;
  const hi = Math.ceil(maxCost / tickStep) * tickStep;
  const yTicks = [];
  for (let v = lo; v <= hi + 1e-6; v += tickStep) yTicks.push(v);

  const xStep = xmax >= 400 ? 100 : xmax >= 200 ? 50 : 25;
  const xTicks = [];
  for (let x = 0; x <= xmax; x += xStep) xTicks.push(x);

  const mapX = (km) => 55 + (625 * Math.min(xmax, Math.max(0, km))) / xmax;
  const mapY = (val) => 22 + 268 * (1 - (val - lo) / (hi - lo || 1));

  const paths = {};
  ids.forEach((id) => {
    let d = "";
    points.forEach((pt, idx) => {
      const x = mapX(pt.km);
      const y = mapY(pt.costs[id] || 0);
      d += `${idx === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)} `;
    });
    paths[id] = d;
  });

  return `
    <section class="panel">
      <div>
        <h2 class="section-title" style="font-size:1.25rem;">How far you drive changes the answer</h2>
        <p class="section-sub">
          Each line is the total cost of owning over ${yrs} ${yrWord}, at different daily distances. At any distance, the lowest line is the cheapest choice.
        </p>
      </div>

      <div class="chart-legend">
        ${cols
          .map((c) => {
            const acc = ACCENTS[c.id] || ACCENTS.A;
            return `
            <div class="legend-item">
              <span class="legend-line" style="background:${acc.stroke};"></span>
              <span>${escapeHtml(c.label)}</span>
            </div>
          `;
          })
          .join("")}
      </div>

      <div class="chart-box" id="chart-container">
        <svg viewBox="0 0 700 320" class="chart-svg" id="cost-chart-svg" data-lo="${lo}" data-hi="${hi}" data-xmax="${xmax}">
          ${yTicks
            .map((v) => {
              const y = mapY(v);
              return `
              <g>
                <line x1="55" x2="680" y1="${y}" y2="${y}" stroke="currentColor" stroke-opacity="0.14" stroke-width="1" />
                <text x="47" y="${y + 4}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.6">${fmtShort(
                v
              )}</text>
              </g>
            `;
            })
            .join("")}
          ${xTicks
            .map((x) => {
              const px = mapX(x);
              return `<text x="${px}" y="308" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.6">${x}</text>`;
            })
            .join("")}
          ${ids
            .map((id) => {
              const acc = ACCENTS[id] || ACCENTS.A;
              return `<path d="${paths[id]}" fill="none" stroke="${acc.stroke}" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" />`;
            })
            .join("")}
          ${
            userKm > 0 && userKm <= xmax
              ? `
            <g>
              <line x1="${mapX(userKm)}" x2="${mapX(userKm)}" y1="22" y2="290" stroke="currentColor" stroke-dasharray="3 4" stroke-opacity="0.7" stroke-width="1.5" />
              <text x="${mapX(userKm) + (mapX(userKm) > 555 ? -8 : 8)}" y="16" text-anchor="${
                  mapX(userKm) > 555 ? "end" : "start"
                }" font-size="11" font-weight="700" fill="currentColor">You: ${fmtInt(userKm)} km</text>
            </g>
          `
              : ""
          }
          ${switches
            .map((sw) => {
              if (sw.km > xmax) return "";
              const sx = mapX(sw.km);
              const nearPt = points.find((p) => Math.abs(p.km - sw.km) <= 8) || points[0];
              const sy = mapY(nearPt?.costs[sw.to] || 0);
              const acc = ACCENTS[sw.to] || ACCENTS.A;
              return `
              <g>
                <circle cx="${sx}" cy="${sy}" r="5" fill="${acc.stroke}" stroke="#ffffff" stroke-width="2" />
                <text x="${sx}" y="${sy - 10}" text-anchor="middle" font-size="10" font-weight="700" fill="currentColor">${fmtInt(
                sw.km
              )} km</text>
              </g>
            `;
            })
            .join("")}
          <g id="chart-hover-layer"></g>
        </svg>
        <div id="chart-tooltip" class="chart-tooltip" style="display:none;"></div>
      </div>

      ${narrative ? `<div class="narrative-box">${escapeHtml(narrative)}</div>` : ""}
    </section>
  `;
}

function attachChartEvents() {
  const svg = document.getElementById("cost-chart-svg");
  const hoverLayer = document.getElementById("chart-hover-layer");
  const tooltip = document.getElementById("chart-tooltip");
  if (!svg || !hoverLayer || !tooltip || !lastCalcResult || lastCalcResult.locked) return;

  const { xmax, points } = lastCalcResult.chart;
  const cols = lastCalcResult.tableColumns;
  const ids = cols.map((c) => c.id);
  const lo = parseFloat(svg.dataset.lo);
  const hi = parseFloat(svg.dataset.hi);
  const yrs = lastCalcResult.yrs;
  const yrWord = yrs === 1 ? "year" : "years";

  const mapX = (km) => 55 + (625 * Math.min(xmax, Math.max(0, km))) / xmax;
  const mapY = (val) => 22 + 268 * (1 - (val - lo) / (hi - lo || 1));

  svg.addEventListener("pointermove", (e) => {
    const rect = svg.getBoundingClientRect();
    const relX = ((Math.max(55, Math.min(680, (e.clientX - rect.left) * (700 / rect.width))) - 55) / 625) * xmax;
    let bestIdx = 0;
    let bestDist = Infinity;
    points.forEach((pt, idx) => {
      const d = Math.abs(pt.km - relX);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    });

    const pt = points[bestIdx];
    if (!pt) return;

    const px = mapX(pt.km);
    hoverLayer.innerHTML = `
      <line x1="${px}" x2="${px}" y1="22" y2="290" stroke="var(--primary)" stroke-dasharray="3 4" stroke-width="1.5" />
      ${ids
        .map((id) => {
          const v = pt.costs[id];
          if (v === undefined) return "";
          const acc = ACCENTS[id] || ACCENTS.A;
          return `<circle cx="${px}" cy="${mapY(v)}" r="4.5" fill="${acc.stroke}" stroke="#ffffff" stroke-width="1.5" />`;
        })
        .join("")}
    `;

    const sortedIds = ids.slice().sort((a, b) => (pt.costs[a] || 0) - (pt.costs[b] || 0));
    const leftPct = Math.min(70, Math.max(4, (px / 700) * 100));
    tooltip.style.left = `${leftPct}%`;
    tooltip.style.display = "block";
    tooltip.innerHTML = `
      <div style="font-weight:700;">${fmtInt(pt.km)} km a day</div>
      <div style="font-size:0.68rem; color:var(--muted-fg); margin-bottom:0.35rem;">Total cost of owning, ${yrs} ${yrWord}</div>
      <div style="display:flex; flex-direction:column; gap:0.25rem;">
        ${sortedIds
          .map((id, idx) => {
            const col = cols.find((c) => c.id === id);
            const acc = ACCENTS[id] || ACCENTS.A;
            const cost = pt.costs[id] || 0;
            return `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:0.75rem;">
              <div style="display:flex; align-items:center; gap:0.35rem;">
                <span style="width:0.5rem; height:0.5rem; border-radius:999px; background:${acc.stroke}; display:inline-block;"></span>
                <span style="font-weight:500;">${escapeHtml(col ? col.label : id)}</span>
                ${idx === 0 ? `<span style="font-size:0.65rem; font-weight:700; color:var(--primary);">· cheapest</span>` : ""}
              </div>
              <span style="font-weight:700; font-variant-numeric:tabular-nums;">${fmtRs(cost)}</span>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
  });

  svg.addEventListener("pointerleave", () => {
    hoverLayer.innerHTML = "";
    tooltip.style.display = "none";
  });
}

function renderAll() {
  renderFormsSection();
  renderResults();
}

// Event Delegation for Seamless Interactive Updates
document.addEventListener("input", (e) => {
  const t = e.target;
  if (!(t instanceof HTMLInputElement)) return;

  if (t.dataset.bind) {
    state[t.dataset.bind] = t.value;
  } else if (t.dataset.bindCurrency) {
    const formatted = formatIndianInput(t.value);
    t.value = formatted;
    state[t.dataset.bindCurrency] = formatted;
  } else if (t.dataset.bindDecimal) {
    const cleaned = t.value.replace(/[^0-9.]/g, "");
    t.value = cleaned;
    state[t.dataset.bindDecimal] = cleaned;
  } else if (t.dataset.bindInt) {
    const cleaned = t.value.replace(/[^0-9]/g, "");
    t.value = cleaned;
    state[t.dataset.bindInt] = cleaned;
  } else if (t.dataset.carId) {
    const car = state.cars.find((c) => c.id === t.dataset.carId);
    if (!car) return;
    if (t.dataset.carField) {
      car[t.dataset.carField] = t.value;
    } else if (t.dataset.carCurrency) {
      const formatted = formatIndianInput(t.value);
      t.value = formatted;
      car[t.dataset.carCurrency] = formatted;
    } else if (t.dataset.carDecimal) {
      const cleaned = t.value.replace(/[^0-9.]/g, "");
      t.value = cleaned;
      car[t.dataset.carDecimal] = cleaned;
    } else if (t.dataset.carInt) {
      const cleaned = t.value.replace(/[^0-9]/g, "");
      t.value = cleaned;
      car[t.dataset.carInt] = cleaned;
    }
  } else {
    return;
  }

  saveState();
  updateInlineHelpers();
  renderResults();
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === "set-mode") {
    const nextMode = btn.dataset.mode;
    if (nextMode && nextMode !== state.mode) {
      state.mode = nextMode;
      saveState();
      renderAll();
    }
  } else if (action === "set-current-fuel") {
    const nextFuel = btn.dataset.fuel;
    if (nextFuel && nextFuel !== state.oFuel) {
      state.oMemEff = { ...state.oMemEff, [state.oFuel]: state.oEff };
      state.oMemMnt = { ...state.oMemMnt, [state.oFuel]: state.oMnt };
      state.oFuel = nextFuel;
      state.oEff = state.oMemEff[nextFuel] || (nextFuel === "ev" ? "6.5" : "10");
      state.oMnt = state.oMemMnt[nextFuel] || (nextFuel === "ev" ? "30,000" : "1,20,000");
      saveState();
      renderAll();
    }
  } else if (action === "set-car-fuel") {
    const carId = btn.dataset.carId;
    const nextFuel = btn.dataset.fuel;
    const car = state.cars.find((c) => c.id === carId);
    if (car && nextFuel && nextFuel !== car.fuel) {
      car.memEff = { ...car.memEff, [car.fuel]: car.eff };
      car.memMnt = { ...car.memMnt, [car.fuel]: car.mnt };
      car.fuel = nextFuel;
      car.eff = car.memEff[nextFuel] || (nextFuel === "ev" ? "6.5" : "15");
      car.mnt = car.memMnt[nextFuel] || (nextFuel === "ev" ? "30,000" : "60,000");
      saveState();
      renderAll();
    }
  } else if (action === "set-car-pay") {
    const carId = btn.dataset.carId;
    const nextPay = btn.dataset.pay;
    const car = state.cars.find((c) => c.id === carId);
    if (car && nextPay && nextPay !== car.pay) {
      car.pay = nextPay;
      saveState();
      renderAll();
    }
  } else if (action === "add-car") {
    if (state.cars.length >= 6) return;
    const usedIds = state.cars.map((c) => c.id);
    const nextId = ["A", "B", "C", "D", "E", "F"].find((id) => !usedIds.includes(id));
    if (!nextId) return;
    const tpl = CAR_TEMPLATES[nextId] || CAR_TEMPLATES.C;
    state.cars.push({
      id: nextId,
      name: "",
      fuel: tpl.fuel,
      price: tpl.price,
      eff: tpl.eff,
      keep: tpl.keep,
      pay: "cash",
      up: "",
      inst: "",
      mon: "",
      mnt: tpl.mnt,
      memEff: { pet: "15", ev: "6.5" },
      memMnt: { pet: "60,000", ev: "30,000" }
    });
    saveState();
    renderAll();
  } else if (action === "remove-car") {
    const carId = btn.dataset.carId;
    if (state.cars.length > 1) {
      state.cars = state.cars.filter((c) => c.id !== carId);
      saveState();
      renderAll();
    }
  } else if (action === "toggle-upkeep") {
    const id = btn.dataset.id;
    uiState.openUpkeep[id] = !uiState.openUpkeep[id];
    renderFormsSection();
  } else if (action === "toggle-under-hood") {
    uiState.openUnderHood = !uiState.openUnderHood;
    renderFormsSection();
  } else if (action === "toggle-see-why") {
    const id = btn.dataset.id;
    uiState.openSeeWhy[id] = !uiState.openSeeWhy[id];
    renderResults();
  } else if (action === "step-km") {
    const delta = parseInt(btn.dataset.delta, 10) || 0;
    const curKm = parseNum(state.km);
    state.km = String(Math.max(1, Math.min(1000, curKm + delta)));
    saveState();
    renderAll();
  } else if (action === "step-hood") {
    const field = btn.dataset.field;
    const delta = parseFloat(btn.dataset.delta) || 0;
    const min = parseFloat(btn.dataset.min) || 0;
    const max = parseFloat(btn.dataset.max) || 40;
    const curVal = parseNum(state[field]);
    state[field] = String(Math.max(min, Math.min(max, curVal + delta)));
    saveState();
    renderAll();
  } else if (action === "toggle-solar") {
    const chk = btn;
    if (chk.checked) {
      uiState.savedNonSolarEle = state.ele || "60";
      state.solar = true;
      state.ele = "11";
    } else {
      state.solar = false;
      state.ele = uiState.savedNonSolarEle || "60";
    }
    saveState();
    renderAll();
  } else if (action === "reset-default") {
    state = structuredClone(DEFAULT_STATE);
    saveState();
    renderAll();
  } else if (action === "load-prompt-example") {
    state = structuredClone(PROMPT_EXAMPLE_STATE);
    saveState();
    renderAll();
  } else if (action === "toggle-theme") {
    // Two-state dark-mode-toggle following modern-web-guidance
    const meta = document.querySelector('meta[name="color-scheme"]');
    const stored = localStorage.getItem("color-scheme");
    const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const sysScheme = sysDark ? "dark" : "light";
    const currentRendered = stored === "dark" || stored === "light" ? stored : sysScheme;
    const target = currentRendered === "dark" ? "light" : "dark";
    if (target !== sysScheme) {
      localStorage.setItem("color-scheme", target);
      meta.content = target;
    } else {
      localStorage.removeItem("color-scheme");
      meta.content = "light dark";
    }
  }
});

// Keep theme synced across tabs (modern-web-guidance: dark-mode-toggle)
window.addEventListener("storage", (e) => {
  if (e.key === "color-scheme") {
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.content = e.newValue ?? "light dark";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
});

