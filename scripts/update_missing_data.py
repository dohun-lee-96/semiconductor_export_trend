from __future__ import annotations

import argparse
import datetime as dt
import importlib.util
import re
import sys
from pathlib import Path

import requests


ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / "src" / "data.js"
BUILD_REPORT = ROOT / ".cursor" / "skills" / "semiconductor-export-report" / "scripts" / "build_report.py"


def load_build_report_module():
    spec = importlib.util.spec_from_file_location("semiconductor_build_report", BUILD_REPORT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {BUILD_REPORT}")
    module = importlib.util.module_from_spec(spec)
    sys.modules["semiconductor_build_report"] = module
    spec.loader.exec_module(module)
    return module


def parse_exports(source: str) -> dict[str, float]:
    match = re.search(r"const PUBLISHED_MONTHLY_EXPORTS_BILLION_USD = \{(.*?)\};", source, flags=re.S)
    if not match:
        raise ValueError(f"Could not find PUBLISHED_MONTHLY_EXPORTS_BILLION_USD in {DATA_JS}")
    return {
        period: float(value)
        for period, value in re.findall(r'"(\d{4}-\d{2})":\s*([0-9.]+)', match.group(1))
    }


def format_exports(values: dict[str, float]) -> str:
    lines = ["const PUBLISHED_MONTHLY_EXPORTS_BILLION_USD = {"]
    periods = sorted(values)
    for index, period in enumerate(periods):
        comma = "," if index < len(periods) - 1 else ""
        value = f"{values[period]:.2f}".rstrip("0").rstrip(".")
        if "." not in value:
            value = f"{value}.0"
        lines.append(f'  "{period}": {value}{comma}')
    lines.append("};")
    return "\n".join(lines)


def update_data_js(updates: dict[str, float]) -> None:
    source = DATA_JS.read_text(encoding="utf-8")
    current = parse_exports(source)
    current.update(updates)

    source = re.sub(
        r"const PUBLISHED_MONTHLY_EXPORTS_BILLION_USD = \{.*?\};",
        format_exports(current),
        source,
        flags=re.S,
    )
    source = re.sub(
        r'const DATA_LAST_UPDATED = ".*?";',
        f'const DATA_LAST_UPDATED = "{dt.date.today().isoformat()}";',
        source,
    )
    source = re.sub(
        r'const DATA_SOURCE_RANGE = ".*?";',
        f'const DATA_SOURCE_RANGE = "{min(current)} ~ {max(current)}";',
        source,
    )
    DATA_JS.write_text(source, encoding="utf-8")


def month_range(start: str, end: str) -> list[str]:
    year, month = [int(part) for part in start.split("-")]
    end_year, end_month = [int(part) for part in end.split("-")]
    periods: list[str] = []

    while (year, month) <= (end_year, end_month):
        periods.append(f"{year:04d}-{month:02d}")
        year += month // 12
        month = month % 12 + 1

    return periods


def latest_candidate_period(today: dt.date) -> str:
    # MOTIR monthly releases are usually published after month-end, so do not
    # expect the current month to be available before it is complete.
    first_of_this_month = dt.date(today.year, today.month, 1)
    previous_month = first_of_this_month - dt.timedelta(days=1)
    return previous_month.strftime("%Y-%m")


def collect_missing_periods(periods: list[str], max_pages: int) -> dict[str, float]:
    module = load_build_report_module()
    session = requests.Session()
    posts = module.scrape_posts(session, max_pages=max_pages)
    posts_by_period = {post.month.strftime("%Y-%m"): post for post in posts}
    updates: dict[str, float] = {}

    for period in periods:
        post = posts_by_period.get(period)
        if post is None:
            print(f"skip {period}: matching MOTIR post was not found")
            continue

        try:
            pdf_url = module.find_pdf_url(session, post)
            pdf_bytes = module.download_pdf(session, pdf_url, post.detail_url)
            text = module.extract_pdf_text(pdf_bytes)
            export_value, _ = module.extract_semiconductor_values(text)
        except Exception as exc:
            print(f"skip {period}: {exc}")
            continue

        if export_value is None:
            print(f"skip {period}: semiconductor export amount was not parseable")
            continue

        updates[period] = round(float(export_value), 2)
        print(f"add {period}: {updates[period]} from {post.title}")

    return updates


def main() -> int:
    parser = argparse.ArgumentParser(description="Add missing MOTIR semiconductor monthly export data.")
    parser.add_argument("--max-pages", type=int, default=12, help="MOTIR list pages to scan.")
    parser.add_argument("--from-period", help="Optional YYYY-MM start period.")
    parser.add_argument("--to-period", help="Optional YYYY-MM end period.")
    args = parser.parse_args()

    source = DATA_JS.read_text(encoding="utf-8")
    current = parse_exports(source)
    to_period = args.to_period or latest_candidate_period(dt.date.today())
    from_period = args.from_period or min(current)
    missing = [period for period in month_range(from_period, to_period) if period not in current]

    if not missing:
        print(f"No missing periods through {to_period}.")
        return 0

    print(f"Missing periods through {to_period}: {', '.join(missing)}")
    updates = collect_missing_periods(missing, max_pages=args.max_pages)
    if not updates:
        print("No new parseable values found.")
        return 0

    update_data_js(updates)
    print(f"Updated {DATA_JS} with {len(updates)} value(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
