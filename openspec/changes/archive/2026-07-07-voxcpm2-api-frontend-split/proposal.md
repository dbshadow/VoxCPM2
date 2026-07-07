## Why

將原本僅能在 Windows 本機運行的 VoxCPM2 語音合成工作站，重構為前後端分離架構。這能讓使用者將耗費 GPU 資源的模型推理部署在配備 NVIDIA GPU 的遠端伺服器上，並透過任何公開網路上的瀏覽器前端進行操作，降低本機硬體要求並提升可用性。

## What Changes

- **後端 API 服務化**：將 `Studio0808_VoxCPM.py` 的推理邏輯與模型下載管理抽離，改以 FastAPI 框架提供 REST API 與 SSE (Server-Sent Events) 即時日誌服務。
- **Web 前端 UI**：使用 React/Vite 與 Tailwind CSS 重新設計現代化 Web 介面，取代原本的 CustomTkinter 本地 GUI。
- **音訊錄製與播放**：改為瀏覽器原生的 `MediaRecorder` 與 `AudioContext` 進行錄音與即時音波視覺化。
- **批次生成流程**：批次生成工作流改由前端驅動，藉由前端異步循環調用後端 TTS 介面，並在瀏覽器端使用 `JSZip` 進行打包下載，後端維持無狀態 (Stateless)。
- **安全防護**：引進 API-Key 驗證機制，防止暴露在公網上的 GPU 被非授權使用。

## Capabilities

### New Capabilities
- `backend-api`: 提供基於 FastAPI 的語音合成、模型下載與管理、SSE 日誌推送，以及 API-Key 鑑權。
- `frontend-web-ui`: 基於 React 的語音合成 Web 操作面板，支援語音設計、聲音複製、極限複製，並透過 Web Audio API 實作錄音與即時音量波形。
- `batch-synthesis-flow`: 前端驅動的批次合成與打包下載流程。

### Modified Capabilities
（無，此專案規格目前為全新導入）

## Impact

- **代碼庫影響**：新增 `backend/` 目錄放置 FastAPI 程式碼與 Docker 部署設定，新增 `frontend/` 目錄放置 Vite 專案。舊有的 `Studio0808_VoxCPM.py` 與 `index.html` 可在移轉完成後予以保留或封存。
- **API 與協議**：後端暴露 HTTP API（JSON 與 Multipart 表單）與 SSE 串流。
- **依賴變更**：後端新增 `fastapi`, `uvicorn`, `python-multipart` 等依賴；前端新增 React 相關生態及 `jszip`。
- **部署環境**：後端需有 NVIDIA CUDA 驅動的環境或容器支援。前端需設定環境變數指向後端網址並具備 CORS 支援。
