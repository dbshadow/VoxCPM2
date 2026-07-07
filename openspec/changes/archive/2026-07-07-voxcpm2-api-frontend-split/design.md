## Context

原本的 VoxCPM2 語音合成工作站是一個基於 CustomTkinter 的 Windows 本地桌面 GUI 應用程式。隨著模型參數量（2B）與硬體需求（建議 VRAM >= 6GB 進行 CUDA 加速）的提升，將模型推理與前端操作綁定在同一台 Windows 電腦上，限制了軟體的靈活性。
此設計旨在將其重構為前後端分離架構，讓使用者能在配備 NVIDIA GPU 的 Linux/Windows 伺服器上部署後端，並透過公網的瀏覽器前端連線使用，提供與本機應用程式一致或更好的使用者體驗。

## Goals / Non-Goals

**Goals:**
- 將語音合成、模型下載與管理等功能封裝為 FastAPI Web 服務。
- 使用 React/Vite + Tailwind CSS 打造支持 RWD 的現代化 Web 前端，部署於公網託管平台。
- 支援麥克風音訊錄製與即時 Canvas 頻譜視覺化。
- 支援以前端驅動模式進行多句語音的批次生成與瀏覽器端 JSZip 打包下載。
- 提供 API-Key 鑑權機制，保護後端 GPU 運算資源。

**Non-Goals:**
- 不改變 VoxCPM2 模型本身的推理邏輯與生成品質（如模型核心權重或生成參數）。
- 後端不引入複雜的資料庫、Celery 任務佇列或 Redis 做持久化任務管理，保持後端為無狀態。
- 不提供多用戶註冊、權限分配或計費管理等 SaaS 功能，本專案定位仍為單用戶/私有化部署工作站。

## Decisions

### 1. 後端框架選用 FastAPI
- **選擇**：FastAPI
- **原因**：相較於 Flask，FastAPI 具有原生的 async/await 異步支持、內建的 Pydantic 參數校驗與 OpenAPI 文件自動生成，非常適合處理語音生成這種可能需要長時間等待的 I/O 與 CPU/GPU 密集型任務。
- **替代方案**：Flask (開發簡單，但異步效能與 SSE 支持較弱)。

### 2. 批次合成採前端驅動模式
- **選擇**：由前端（瀏覽器）拆分文字，逐句向後端發送語音設計 `/api/tts/design` 請求。
- **原因**：後端保持 Stateless，不需維護背景任務隊列與資料庫。前端能完美呈現每句生成進度（如 1/10 句成功），並支援單句重新生成，且可在瀏覽器端用 `jszip` 將 Blob 打包下載，減輕伺服器 CPU 壓縮打包的負擔。
- **替代方案**：後端 Task Queue (Celery + Redis)。會顯著增加系統複雜度與部署門檻。

### 3. 即時日誌與進度傳輸採用 SSE (Server-Sent Events)
- **選擇**：SSE
- **原因**：相較於 WebSocket 的雙向通訊，SSE 是單向（後端到前端）的高效輕量協議，最適合將後端的控制台日誌（Log）和模型下載進度「流式」推送到前端呈現。
- **替代方案**：WebSocket (過於沉重) 或 HTTP Polling (會產生過多請求且不即時)。

### 4. 瀏覽器端麥克風錄製與 AAC/WAV 處理
- **選擇**：前端使用 `MediaRecorder` 錄製音訊，並將產生的 Blob 發送給後端。後端使用 `SoundFile` / `Librosa` 自動處理音訊格式相容性。
- **原因**：網頁端無法直接使用 `pyaudio` 或 `sounddevice`，必須使用 HTML5 Web API。
- **替代方案**：前端上傳已錄製好的檔案 (體驗較差)。

## Risks / Trade-offs

- **[Risk] 跨域資源共享 (CORS) 限制**
  - **Mitigation**：FastAPI 配置 `CORSMiddleware`，並在前端設定中允許使用者自訂後端端點。
- **[Risk] Mixed Content (HTTPS 前端請求 HTTP 後端)**
  - **Mitigation**：在部署指南中說明解決方案，包括使用 Cloudflare Tunnels (推薦) 或 Nginx Proxy + Let's Encrypt 自動獲取 HTTPS。
- **[Risk] 後端 GPU 被濫用**
  - **Mitigation**：引入簡易的 API-Key 機制，後端在啟動時讀取環境變數 `VOXCPM_API_KEY`，前端需在「設定」中填入該 Key，並在 Header `Authorization: Bearer <KEY>` 帶上。
