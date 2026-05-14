const MANUAL_DATA_KEY = "semiconductorManualExports";
const REMOTE_DATA_URL = "https://dohun-lee-96.github.io/semiconductor_export_trend/src/data.js";
const ACTIONS_URL = "https://github.com/dohun-lee-96/semiconductor_export_trend/actions/workflows/update-motir-data.yml";

const state = {
  months: 120,
  chart: null,
  data: buildDatasetFromExports({ ...PUBLISHED_MONTHLY_EXPORTS_BILLION_USD, ...loadManualExports() }),
  dataLastUpdated: DATA_LAST_UPDATED,
  dataSourceRange: DATA_SOURCE_RANGE
};

const text = {
  billionUsd: "\uc5b5 \ub2ec\ub7ec",
  billionUsdPerDay: "\uc5b5 \ub2ec\ub7ec/\uc77c",
  semiconductorExport: "\ubc18\ub3c4\uccb4 \uc218\ucd9c",
  semiconductorImport: "\ubc18\ub3c4\uccb4 \uc218\uc785",
  confirmNeeded: "\ud655\uc778 \ud544\uc694",
  update: "\uc5c5\ub370\uc774\ud2b8",
  asOf: "\uae30\uc900",
  updatedAt: "\ub370\uc774\ud130 \uac31\uc2e0\uc77c",
  sourceRange: "\uc800\uc7a5 \ubc94\uc704",
  workingDays: "\uc870\uc5c5\uc77c\uc218",
  sourceType: "\ub370\uc774\ud130 \uc131\uaca9",
  alreadyIncluded: "\ub370\uc774\ud130\uac00 \uc774\ubbf8 \uc571\uc5d0 \ud3ec\ud568\ub418\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.",
  noUpdate: "\uc5c5\ub370\uc774\ud2b8 \ud560 \ub0b4\uc6a9\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."
};

const formatBillion = (value) => {
  if (value === null || value === undefined) return "-";
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}${text.billionUsd}`;
};
const formatDaily = (value) => `${value.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${text.billionUsdPerDay}`;
const formatPct = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

function loadManualExports() {
  try {
    return JSON.parse(localStorage.getItem(MANUAL_DATA_KEY) || "{}");
  } catch (error) {
    return {};
  }
}

function saveManualExports(values) {
  localStorage.setItem(MANUAL_DATA_KEY, JSON.stringify(values));
}

function sourceRangeForRows(rows) {
  if (!rows.length) return "-";
  return `${rows[0].period} ~ ${rows[rows.length - 1].period}`;
}

function getFilteredData() {
  return state.data.slice(-state.months);
}

function getPreviousRow(row) {
  const index = state.data.findIndex((item) => item.period === row.period);
  return index > 0 ? state.data[index - 1] : null;
}

function setUpdateMessage(message, type = "info") {
  const element = document.getElementById("updateMessage");
  element.hidden = false;
  element.className = `update-status ${type}`;
  element.textContent = `${type === "error" ? text.confirmNeeded : text.update}: ${message}`;
}

function renderKpis(rows) {
  const latest = rows[rows.length - 1];

  document.getElementById("latestMonthly").textContent = formatBillion(latest.monthlyExport);
  document.getElementById("latestMonthLabel").textContent = `${latest.period} ${text.asOf}`;
  document.getElementById("lastUpdated").textContent = `${text.updatedAt}: ${state.dataLastUpdated} · ${text.sourceRange}: ${state.dataSourceRange}`;
}

function renderChart(rows) {
  const labels = rows.map((row) => row.period);
  const exportValues = rows.map((row) => row.monthlyExport);
  const maxExport = Math.max(...exportValues);
  const minExport = Math.min(...exportValues);
  const pointColors = exportValues.map((value) => {
    if (value === maxExport) return "#dc2626";
    if (value === minExport) return "#2563eb";
    return "#6b7280";
  });

  const datasets = [
    {
      type: "line",
      label: text.semiconductorExport,
      data: exportValues,
      borderColor: "#6b7280",
      backgroundColor: "rgba(107, 114, 128, 0.12)",
      borderWidth: 3,
      fill: true,
      tension: 0.32,
      pointBackgroundColor: pointColors,
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      pointRadius: exportValues.map((value) => value === maxExport || value === minExport ? 7 : 4),
      pointHoverRadius: 8
    }
  ];

  if (state.chart) {
    state.chart.data.labels = labels;
    state.chart.data.datasets = datasets;
    state.chart.update("none");
    return;
  }

  const context = document.getElementById("dailyExportChart").getContext("2d");
  state.chart = new Chart(context, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${formatBillion(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
            callback(value) {
              const label = this.getLabelForValue(value);
              const [year, month] = label.split("-");
              return `'${year.slice(2)}.${month}`;
            }
          }
        },
        y: { title: { display: true, text: text.billionUsd }, ticks: { callback: (value) => value.toFixed(0) } }
      }
    }
  });
}

function renderTable(rows) {
  const table = document.getElementById("dataTable");
  table.innerHTML = rows.slice().reverse().map((row) => {
    const previous = getPreviousRow(row);
    const change = previous ? ((row.monthlyExport - previous.monthlyExport) / previous.monthlyExport) * 100 : 0;
    const changeClass = change >= 0 ? "positive" : "negative";
    return `
      <tr>
        <td>${row.period}</td>
        <td>${formatBillion(row.monthlyExport)}</td>
        <td class="${changeClass}">${previous ? formatPct(change) : "-"}</td>
      </tr>
    `;
  }).join("");
}

function parseRemoteData(source) {
  const dataMatch = source.match(/const PUBLISHED_MONTHLY_EXPORTS_BILLION_USD = \{([\s\S]*?)\};/);
  if (!dataMatch) throw new Error("remote data object was not found");

  const exports = {};
  for (const match of dataMatch[1].matchAll(/"(\d{4}-\d{2})":\s*([0-9.]+)/g)) {
    exports[match[1]] = Number(match[2]);
  }

  const updatedMatch = source.match(/const DATA_LAST_UPDATED = "([^"]+)";/);
  const rangeMatch = source.match(/const DATA_SOURCE_RANGE = "([^"]+)";/);
  return {
    exports,
    updatedAt: updatedMatch ? updatedMatch[1] : state.dataLastUpdated,
    sourceRange: rangeMatch ? rangeMatch[1] : state.dataSourceRange
  };
}

function buildDatasetFromExports(exports) {
  return Object.keys(exports)
    .sort()
    .map((period) => {
      const [year, month] = period.split("-").map(Number);
      const monthlyExport = exports[period];
      const workingDays = PUBLISHED_WORKING_DAYS[period] ?? getWorkingDays(year, month);
      return {
        period,
        year,
        month,
        monthlyExport: Number(monthlyExport.toFixed(2)),
        monthlyImport: null,
        workingDays,
        dailyAverage: Number((monthlyExport / workingDays).toFixed(2)),
        sourceType: "GitHub Pages 최신 저장값"
      };
    });
}

function latestPeriod(rows) {
  return rows.length ? rows[rows.length - 1].period : "";
}

async function updateCurrentMonth() {
  const button = document.getElementById("updateData");
  button.disabled = true;
  setUpdateMessage("GitHub Pages의 최신 데이터를 확인하고 있습니다.");

  try {
    const response = await fetch(`${REMOTE_DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const remote = parseRemoteData(await response.text());
    const remoteData = buildDatasetFromExports(remote.exports);
    const localLatest = latestPeriod(state.data);
    const remoteLatest = latestPeriod(remoteData);

    if (remoteLatest > localLatest || remoteData.length > state.data.length) {
      state.data = buildDatasetFromExports({ ...remote.exports, ...loadManualExports() });
      state.dataLastUpdated = remote.updatedAt;
      state.dataSourceRange = sourceRangeForRows(state.data);
      render();
      setUpdateMessage(`${remoteLatest} 기준 GitHub Pages 최신 데이터를 앱 화면에 반영했습니다.`, "success");
      return;
    }

    setUpdateMessage(`${text.noUpdate} 새 MOTIR PDF 반영이 필요하면 GitHub Actions에서 Update MOTIR semiconductor data를 Run workflow로 실행하세요: ${ACTIONS_URL}`);
  } catch (error) {
    setUpdateMessage(`GitHub Pages 데이터 확인에 실패했습니다. GitHub Actions에서 수동 실행해 주세요: ${ACTIONS_URL}`, "error");
  } finally {
    button.disabled = false;
  }
}

function addManualData(event) {
  event.preventDefault();

  const periodInput = document.getElementById("manualPeriod");
  const exportInput = document.getElementById("manualExport");
  const period = periodInput.value;
  const exportValue = Number(exportInput.value);

  if (!/^\d{4}-\d{2}$/.test(period) || !Number.isFinite(exportValue) || exportValue <= 0) {
    setUpdateMessage("월과 수출액을 올바르게 입력해 주세요.", "error");
    return;
  }

  const manualExports = loadManualExports();
  manualExports[period] = Number(exportValue.toFixed(2));
  saveManualExports(manualExports);

  state.data = buildDatasetFromExports({ ...PUBLISHED_MONTHLY_EXPORTS_BILLION_USD, ...manualExports });
  state.dataLastUpdated = "직접 입력 포함";
  state.dataSourceRange = sourceRangeForRows(state.data);
  render();

  exportInput.value = "";
  setUpdateMessage(`${period} ${formatBillion(exportValue)} 값을 추가했습니다.`, "success");
}

function render() {
  const rows = getFilteredData();
  renderKpis(rows);
  renderChart(rows);
  renderTable(rows);
}

document.getElementById("monthSelect").addEventListener("change", (event) => {
  state.months = Number(event.target.value);
  render();
});
document.getElementById("manualDataForm").addEventListener("submit", addManualData);
document.getElementById("updateData").addEventListener("click", updateCurrentMonth);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

render();
