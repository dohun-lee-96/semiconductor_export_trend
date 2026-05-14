const PUBLISHED_MONTHLY_EXPORTS_BILLION_USD = {
  "2025-01": 101.0,
  "2025-02": 96.0,
  "2025-03": 131.0,
  "2025-04": 117.0,
  "2025-05": 138.0,
  "2025-06": 150.0,
  "2025-07": 147.1,
  "2025-08": 151.0,
  "2025-09": 166.1,
  "2025-10": 157.3,
  "2025-11": 172.6,
  "2025-12": 208.0,
  "2026-01": 205.4,
  "2026-02": 251.6,
  "2026-03": 328.3,
  "2026-04": 319.0
};

const PUBLISHED_MONTHLY_IMPORTS_BILLION_USD = {
};

const PUBLISHED_WORKING_DAYS = {
  "2025-01": 20,
  "2025-08": 22.5,
  "2026-02": 19,
  "2026-03": 23,
  "2026-04": 24
};

const KOREA_FIXED_HOLIDAYS = new Set(["01-01", "03-01", "05-05", "06-06", "08-15", "10-03", "10-09", "12-25"]);

function getWorkingDays(year, month) {
  const lastDay = new Date(year, month, 0).getDate();
  let days = 0;

  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const key = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !KOREA_FIXED_HOLIDAYS.has(key)) {
      days += 1;
    }
  }

  return days;
}

function buildMonthlyDataset() {
  return Object.keys(PUBLISHED_MONTHLY_EXPORTS_BILLION_USD)
    .sort()
    .map((period) => {
      const [year, month] = period.split("-").map(Number);
      const monthlyExport = PUBLISHED_MONTHLY_EXPORTS_BILLION_USD[period];
      const monthlyImport = PUBLISHED_MONTHLY_IMPORTS_BILLION_USD[period] ?? null;
      const workingDays = PUBLISHED_WORKING_DAYS[period] ?? getWorkingDays(year, month);

      return {
        period,
        year,
        month,
        monthlyExport: Number(monthlyExport.toFixed(1)),
        monthlyImport: monthlyImport === null ? null : Number(monthlyImport.toFixed(1)),
        workingDays,
        dailyAverage: Number((monthlyExport / workingDays).toFixed(2)),
        sourceType: "MOTIR 월별 PDF 저장값"
      };
    });
}

const SEMICONDUCTOR_EXPORT_DATA = buildMonthlyDataset();
const DATA_LAST_UPDATED = "2026-05-14";
const DATA_SOURCE_RANGE = "2025-01 ~ 2026-04";
