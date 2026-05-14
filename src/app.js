const state = {
  months: 12,
  chart: null
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
  noUpdate: "\uc5c5\ub370\uc774\ud2b8 \ud560 \ub0b4\uc6a9\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. iPhone \ub2e8\ub3c5 \uc124\uce58\ud615 PWA\ub294 \uc800\uc7a5\ub41c \ub370\uc774\ud130\ub97c \ubcf4\uc5ec\uc8fc\uba70, \uc0c8 MOTIR PDF \ubc18\uc601\uc740 \uc571 \ud30c\uc77c\uc744 \ub2e4\uc2dc \ubc30\ud3ec\ud574\uc57c \uc801\uc6a9\ub429\ub2c8\ub2e4."
};

const formatBillion = (value) => {
  if (value === null || value === undefined) return "-";
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}${text.billionUsd}`;
};
const formatDaily = (value) => `${value.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${text.billionUsdPerDay}`;
const formatPct = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

function getFilteredData() {
  return SEMICONDUCTOR_EXPORT_DATA.slice(-state.months);
}

function getPreviousRow(row) {
  const index = SEMICONDUCTOR_EXPORT_DATA.findIndex((item) => item.period === row.period);
  return index > 0 ? SEMICONDUCTOR_EXPORT_DATA[index - 1] : null;
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
  document.getElementById("lastUpdated").textContent = `${text.updatedAt}: ${DATA_LAST_UPDATED} · ${text.sourceRange}: ${DATA_SOURCE_RANGE}`;
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

function updateCurrentMonth() {
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const hasCurrentMonth = SEMICONDUCTOR_EXPORT_DATA.some((row) => row.period === currentPeriod);

  if (hasCurrentMonth) {
    setUpdateMessage(`${currentPeriod} ${text.alreadyIncluded}`, "success");
    return;
  }

  setUpdateMessage(text.noUpdate);
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
document.getElementById("updateData").addEventListener("click", updateCurrentMonth);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

render();
