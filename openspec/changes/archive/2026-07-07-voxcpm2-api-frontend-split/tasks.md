## 1. 後端環境初始化與 API 核心框架

- [x] 1.1 初始化 `backend/` 目錄結構，加入依賴檔案 `requirements.txt` (FastAPI, Uvicorn, python-multipart 等)
- [x] 1.2 撰寫 `backend/config.py` 管理 API-Key、模型路徑、CORS 設置等環境變數
- [x] 1.3 實作核心 `backend/main.py` 並建立 FastAPI 實例與 CORS 中介軟體
- [x] 1.4 實作 API-Key 鑑權依賴項，防護所有推理與管理端點

## 2. 後端推理與管理 API 實作

- [x] 2.1 實作 `/api/status` 端點檢測 GPU 可用性與模型狀態
- [x] 2.2 實作 `/api/model/download` 與 `/api/model/download/stream` 透過 SSE 推送下載日誌與進度
- [x] 2.3 將 VoxCPM2 推理程式碼集成，實作 `backend/inference.py` 並提供模型 Lazy Load 與單次生成包裝
- [x] 2.4 實作 `/api/tts/design` 語音設計端點，回傳二進制 WAV 檔案
- [x] 2.5 實作 `/api/tts/clone` 聲音複製端點，接收上傳參考音訊並回傳 WAV 檔案
- [x] 2.6 實作 `/api/tts/ultimate` 極限複製端點，接收音訊、逐字稿與目標文字並回傳 WAV 檔案

## 3. 前端專案初始化與系統設定 UI

- [x] 3.1 初始化 `frontend/` React/Vite 專案結構並配置 Tailwind CSS
- [x] 3.2 實作基本的頁面框架與分頁切換機制（語音設計、聲音複製、極限複製、系統設定）
- [x] 3.3 實作系統設定分頁，允許用戶設定後端 API 地址與 API-Key，並存入 `localStorage`
- [x] 3.4 實作全域 API 連線狀態檢查與 API 呼叫工具函式

## 4. 前端音訊錄製與語音合成介面對接

- [x] 4.1 實作基於 `MediaRecorder` 與 `AudioContext` 的網頁端麥克風錄音組件
- [x] 4.2 實作 Canvas 動態音波視覺化，在錄音時呈現流暢波紋
- [x] 4.3 實作「語音設計」控制項與 API 對接，支援即時播放與 Log 顯示
- [x] 4.4 實作「聲音複製」控制項，支援將錄音音軌或上傳音檔套用為參考音訊並對接 API
- [x] 4.5 實作「極限複製」控制項，支援填寫逐字稿與上傳音訊對接 API
- [x] 4.6 實作即時日誌 Terminal 組件，藉由 EventSource (SSE) 接收後端推理日誌

## 5. 前端批次合成流程與打包

- [x] 5.1 實作批次文字切分與前端異步隊列控制，實現逐句循序請求與進度回報
- [x] 5.2 實作批次生成的「暫停」與「取消」中斷控制邏輯
- [x] 5.3 整合 `JSZip` 實作瀏覽器端音訊 Blob 打包與 ZIP 下載功能

## 6. Docker 容器化與聯調測試

- [x] 6.1 撰寫後端 `backend/Dockerfile` 與 `docker-compose.yml` 支援 NVIDIA GPU 映射
- [x] 6.2 於本地進行前後端聯調測試，確保所有場景 (Scenario) 符合規格
- [x] 6.3 撰寫 `README.md` 的前後端部署說明文檔
