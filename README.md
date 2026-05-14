# 반도체 수출입 동향 iPhone 앱(PWA)

산업통상자원부 MOTIR 월별 수출입 동향 PDF에서 확인한 반도체 수출 데이터를 iPhone에서 홈 화면 앱처럼 볼 수 있는 PWA입니다.

## 설치

PC와 같은 Wi-Fi에 연결할 필요가 없도록, `dist/semiconductor-iphone-public-pwa.zip` 안의 파일을 GitHub Pages, Netlify, Vercel 같은 공개 웹 호스팅에 올립니다.

공개 URL이 생기면 iPhone Safari에서 접속한 뒤 공유 버튼을 누르고 `홈 화면에 추가`를 선택하면 앱처럼 설치됩니다.

## 기능

- 기본 최근 1년 그래프
- 사용자가 최근 6개월/1년/10년 선택
- 월별 반도체 수출액 선형 그래프
- 최신 월 수출액 KPI
- 월별 데이터 테이블
- 직접 입력한 월별 데이터를 iPhone에 저장하고 그래프에 즉시 반영

## 데이터 갱신

영구 데이터는 `src/data.js`에 있습니다. GitHub Actions가 실행되면 이 파일에서 누락된 월만 MOTIR에서 찾아 추가합니다.

```js
"2026-04": 319.0
```

GitHub Actions는 `.github/workflows/update-motir-data.yml`에 있습니다. GitHub repository의 `Actions` 탭에서 `Update MOTIR semiconductor data`를 선택한 뒤 `Run workflow`를 누르면 수동 실행할 수 있고, 매일 자동 실행도 설정되어 있습니다.

## 공개 호스팅에 올릴 파일

PWA 표시에는 아래 파일이 필요합니다.

- `index.html`
- `src/`
- `manifest.webmanifest`
- `sw.js`
- `README.md`

자동 데이터 업데이트에는 아래 파일도 repository에 함께 올려야 합니다.

- `.github/workflows/update-motir-data.yml`
- `scripts/update_missing_data.py`
- `.cursor/skills/semiconductor-export-report/scripts/build_report.py`
- `requirements.txt`

1. 공개 URL을 iPhone Safari에서 엽니다.
2. 공유 버튼을 누릅니다.
3. `홈 화면에 추가`를 선택합니다.

이후 홈 화면 아이콘을 누르면 앱처럼 실행됩니다. iPhone 앱에서 직접 추가한 데이터는 해당 기기의 브라우저 저장소에 보관됩니다. MOTIR PDF 수집과 `src/data.js` 자동 커밋은 GitHub Actions에서 처리합니다.

## iPhone 설치 파일에 대한 제한

iPhone에 바로 설치되는 `.ipa` 파일은 macOS/Xcode와 Apple Developer 서명이 필요합니다. 이 프로젝트는 Windows에서도 실행 가능한 PWA 방식으로 제공하며, Safari의 `홈 화면에 추가`를 통해 설치합니다.
