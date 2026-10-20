# 日本旅遊 — 北海道與東京

2026/12/1–12/10 的旅遊 App。桌面／手機版、每日時間軸、住宿、地圖分類、收藏與行前清單。

## 本地預覽

```sh
cd /Users/yingtil/japan-winter-trip
python3 -m http.server 8088 --bind 127.0.0.1
```

開啟 `http://localhost:8088`。直接開 HTML 也可查看行程。Google Maps 在開啟地圖 tab 時才載入，使用 `goog-map-api-key` 檔案中的 key。地圖需要網路；透過 HTTP／HTTPS 預覽，直接開 HTML 仍可查看行程，但瀏覽器可能不允許讀取 key 檔案。

新版地圖預覽：`http://localhost:8090/index.html?view=map`（啟動 `python3 preview_server.py`）。

## 已填入的行程

| 日期 | 行程 | 住宿 |
| --- | --- | --- |
| 12/1 | 長榮航空 09:30 桃園 → 新千歲，前往札幌 | ONSEN RYOKAN 由縁 札幌 |
| 12/2 | 札幌 → 定山溪；接駁需預約、尚未預約，或搭計程車 | 花もみじ |
| 12/3 | 二見吊橋、定山溪溫泉街 | 花もみじ |
| 12/4 | 定山溪 → 札幌轉 JR → 小樽，或計程車直達 | グリッズプレミアムホテル小樽 |
| 12/5 | 小樽景點、餐廳、天狗山候選；Nikka 余市需另安排交通 | グリッズプレミアムホテル小樽 |
| 12/6 | 小樽 → 新千歲；媽媽班機 15:30；使用者東京班機待提供 | 京王廣場大飯店 |
| 12/7–10 | 東京每日安排／返程資料待提供 | 京王廣場大飯店 |

- 12/1 的 **09:30 為台灣出發地時間**；12/6 媽媽的 **15:30 為日本時間**，不套用為使用者東京航班。
- 使用者提供的時間標為「已提供」，不表示機票已驗證。住宿預訂狀態未提供，保留為待確認。
- 小樽餐廳與景點均為候選，不預設同一天全部造訪。
- 纜車冬期上行 09:00–19:48、下行至 20:00，中央巴士套票 2,450 日圓，以及北一ホール鋼琴演奏資訊，均依使用者資料記錄，尚未驗證當季公告。
- 住宿入住／退房日期按行程段落整理；實際飯店訂單與時間待確認。
- 已移除原先自行建議的東京景點，保留待補欄位。

行程資料在 `index.html` 內；`data/itinerary.json` 是目前資料快照，不在頁面載入時請求，修改後需同步更新快照。

## Google Maps 地圖

- 使用 Maps JavaScript API 與 AdvancedMarkerElement，以星形標記同時顯示多個地點，白色外圈、深色外框，景點亮黃、餐廳橘色、飯店紫色、交通藍色，編號依底色使用深色或白色，對應同色清單編號；免登入訪客可以查看地圖。
- `index.html` 的 `GOOGLE_MAP_OPTIONS.keyFile` 指向使用者提供的 `./goog-map-api-key`。只在開啟地圖時讀取一次，逾時則顯示提示，不阻塞行程內容。原始 key 不複製進 HTML、不加入離線快取、已加入 `.gitignore`。
- 瀏覽器載入 Google 時仍必須傳送 key，因此它不是伺服器祕密。部署時提供同路徑的網站專用瀏覽器 key，並在 Google Cloud 限制允許的 HTTP referrers 與 Maps JavaScript API。不要把管理憑證或服務帳戶金鑰放在此檔。
- 本地預覽允許 `http://localhost:8090/*` 與 `http://127.0.0.1:8090/*`；部署時追加正式網站的網址。從其他 port 開啟也需要對應限制。
- `GOOGLE_MAP_OPTIONS.mapId` 目前為 `DEMO_MAP_ID`，可預覽 Advanced Markers；正式發布時換成自己建立的 JavaScript Map ID。這個 Map ID 不等同免費 Demo Key，不會取消標準 API key 的計費。
- 使用 Google 原始 light mode，移除 Leaflet 配色按鈕與執行時依賴；`vendor/leaflet/` 保留原檔與 LICENSE，未載入或快取。
- 北海道與東京共 **18 個地點資料、14 個標記**，可篩選「景點、餐廳、飯店、交通」，分類同步更新標記與清單。グリッズプレミアムホテル小樽、定山溪溫泉街、小樽倉庫 No.1、北一ホール的座標待確認，保留清單與 Google 搜尋連結。
- 點標記或「定位」可查看資訊與 Google Maps 導航連結。切換分類會自動調整範圍顯示該類標記；「顯示全部」會回到目前地區與分類的所有標記。分类、地區切換及分鐘更新重用同一張地圖，不會每次建立新的 Map。
- 旅行期間依日本日期开啟當天行程；手動選擇日期後跟隨所選日期。12/6 日本時間 18:00 暫定切換東京，待使用者提供班機後更新 `MAP_CONFIG.tokyoArrival`，不以 GPS 判斷所在地。
- 地理查詢記錄保存在 `data/geocoding*.json`，不在頁面載入時請求；本次未新增 Places、Geocoding、Routes 或 Street View API 的使用。

## 導覽

桌面與手機導覽為「旅程、地圖、行前」，已移除收藏 tab。每日行程仍可標記收藏狀態，既有瀏覽器資料保留。

## 地圖版面

地圖頁填滿 header 和地區／分類列下方的視窗，不受旅程頁內容寬度限制。桌面清單浮在右側，內容獨立捲動；手機清單浮在底部，預設收起，可展開後獨立捲動。保留手機底部導覽和安全區，地圖自動取景時避開清單及工具列。切換其他 tab 會恢復一般頁面捲動。

## 用量與計費

以下依 2026-10-19 查得的 Google 全球標準按量價格：Dynamic Maps 的計費事件為成功載入地圖，每月前 10,000 次免費；10,001–100,000 次級距為 US$7／1,000 次。免費額度和級距按同一計費帳戶的對應服務用量合計，不是每個 key 各有一份。

標記數量、資訊視窗、分類、移動與縮放不額外計收地圖載入費。開啟地圖以外的 tab 不載入 Google；切回既有地圖與切換地區會重用 Map。重新載入 App 後第一次開地圖、按重新載入地圖，以及離線後重新連網建立新 Map，可能新增一次載入。

例：3 人 × 每天 20 次地圖載入 × 10 天 = 600 次，若同帳戶當月沒有其他大量用量，落在免費額度內。每月 15,000 次則約 US$35（其他服務和稅項另計）。如果 key 是 Maps Demo Key，則受每日測試額度限制，達上限暫停、不收費；不可用於正式旅行版本。預算通知不會自動停止計費。

官方價格：https://developers.google.com/maps/billing-and-pricing/pricing
計費事件：https://developers.google.com/maps/billing-and-pricing/sku-details#dynamic-maps

## 離線使用

1. 把 `index.html`、`sw.js`、`manifest.webmanifest`、`icon.svg` 部署到同一 HTTPS 網站目錄。
2. 出發前連網開啟一次，等首頁顯示「已保存，可離線查看」。
3. 可加入手機主畫面，再用飛航模式重新開啟確認。

介面、行程、住宿、收藏與地點清單可以離線使用；**Google Maps 和導航需要網路**。離線時地圖區域顯示提示，清單仍可直接查看。清除網站資料、私密模式或瀏覽器回收儲存空間都可能移除快取。

沒有外部字型或初始化 API 請求。手機停用玻璃背景模糊、減少飄雪，尊重「減少動態效果」設定。

## 修改與更新

更新應用程式檔案時提高 `sw.js` 的快取版本，目前 `v19`。新版所有檔案保存成功後才啟用，不會在閱讀中強制重載；重新開啟顯示新版。收藏使用穩定的行程 id；早期原型的索引 key 仍保留在儲存空間，避免改排行程後指向不同內容。

## 驗證

Node.js 18+：

```sh
node --test tests/*.test.cjs
```

23 項邏輯測試：來源／資源、時間軸、航班時區、住宿、地圖地區／分類、待確認座標、離線讀取及快取更新。

另以 JSDOM 和模擬 Google SDK 驗證 file://、HTTP 與新版預覽：延後讀取 key／載入 SDK、載入中切換分類、標記／資訊視窗、分類與地區切換重用地圖、定位、離線／連網恢復、授權錯誤、時間軸及收藏。測試使用虛構 key，不發送 Google 請求、不產生地圖用量。

使用真實 key 及 localhost referrer 的 Google SDK GET 回應 HTTP 200，未發現立即錯誤碼；這不等同完成地圖授權或實際畫面驗證。Meta 瀏覽器啟動因缺少 RemoteExecution 連線而失敗，真實 Google 地圖與手機版操作需在預覽網址確認。

## 預覽與版本更新

地圖已接回 Google Maps API，版本為 `v19`。

若瀏覽器仍讀取先前離線版，更新完成後會提示「載入新版」，點擊即可套用。`preview_server.py` 預設提供 `http://localhost:8090/index.html?view=map`，使用獨立的預覽 origin；線上 HTML 與 worker 回應也要求 HTTP 快取重新驗證。收藏按瀏覽器 origin 保存，因此不同預覽 port 的收藏不會自動共用。

## Git 版本控制

此資料夾使用本機 Git，預設分支為 `main`。`goog-map-api-key` 與 `.DS_Store` 已加入 `.gitignore`；API key 不納入提交。

```sh
git status
git log --oneline
```

## 景點資訊與手機旅程版面（v20）

- 800px 以下，原有雪景改為旅程頁的淡背景，不佔獨立區塊；停止背景飄雪並隱藏時間軸縮圖。桌面仍保留原插圖。
- 日期列支援橫向觸控、捲動及鍵盤捲動；換日保留捲動位置，選取日期置中。
- 12/1、12/2、12/4、12/6 加入可收合交通表。12/3、12/5 加入八個景點簡介及可展開的交通資訊，停留時間為規劃建議。
- 路線按鈕使用 Google Maps 導航連結，沒有新增 Directions API 請求。文字隨 HTML 離線保存，導航與官方網站需要連網。
- 來源範圍：Grids 小樽站步行 9 分鐘來自既有的飯店官方網頁資料；天狗山時間／套票及北一廳燈數／演奏資訊來自使用者提供的資料。官方網頁全文讀取目前受工具存取限制，2026 冬季班次、票價、開放及預約條件未查證，介面均標示待確認。
- 驗證：26 項 Node 測試通過；DOM 模擬驗證日期切換、景點資訊、手機裝飾的無障礙狀態、既有地圖流程與離線行為。Google SDK 使用測試替身；尚未進行實際瀏覽器的版面截圖驗證。

### v21

旅程 tab 移除行前清單側欄，每日行程使用完整寬度。清單保留在行前 tab，既有勾選狀態維持。

## GitHub Pages

Public URL: https://eiteki.github.io/japan-winter-trip/

The Pages workflow publishes only index.html, sw.js, manifest.webmanifest, icon.svg, and optional browser map configuration. Local scripts, data snapshots, and the raw key file are not copied to the website.

Set the repository Actions secret `GOOGLE_MAPS_API_KEY` to the browser key after restricting it in Google Cloud:

- Application restrictions: Websites; allow `https://eiteki.github.io/*`. For local preview, optionally allow `http://localhost:8090/*` and `http://127.0.0.1:8090/*`.
- API restrictions: Maps JavaScript API only.
- The browser key is public in the deployed website, as required by Maps JavaScript API. GitHub Secrets keeps it out of source history; website/API restrictions control where it can be used.
- Main branch pushes deploy automatically; changing only the secret requires a manual workflow run.
- Without the secret, the itinerary and checklist work but the map cannot load.

## Light and dark themes (v29)

- The header button switches themes on desktop and mobile. `japan-theme` stores the selection locally; first use stays light. The saved theme applies before first paint, including offline.
- Dark colors cover the trip timeline, sticky dates, transport and attraction cards, checklist, navigation and map panels. Marker category colors remain vivid.
- Google Maps uses its native LIGHT/DARK color scheme. This initialization option requires a new map instance when changing the theme while the map is open; center and zoom are preserved. Theme changes outside the map tab load no Google resources. Reopening the map applies the selected theme. A new map instance can count as another Dynamic Maps load.
- Verification: 28 Node tests passed, plus DOM simulations at 390px and 1280px for saved theme, switching, checklist palette, map theme/camera, lazy key loading and offline behavior using a mock Google SDK. Main text contrast 12.56:1, secondary text 6.63:1 and links 9.06:1 against their dark surfaces. Actual browser rendering and live Google map palette have not been visually inspected by the agent.
