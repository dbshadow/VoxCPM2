# backend-api Specification

## Purpose
TBD - created by archiving change voxcpm2-api-frontend-split. Update Purpose after archive.
## Requirements
### Requirement: Backend API Server Initialization
後端 API 伺服器啟動時，SHALL 檢查 NVIDIA GPU 是否可用，並檢查 VoxCPM2 模型檔案是否存在。如果模型不存在，伺服器 SHALL 正常啟動但將狀態標記為 `model_not_found`，以便前端可以觸發下載。

#### Scenario: Startup with Missing Model
- **WHEN** 伺服器啟動且本地沒有檢測到 `config.json` 模型設定檔
- **THEN** 伺服器 SHALL 正常啟動並將狀態標記為 `model_not_found`

### Requirement: API-Key Authentication
後端所有 TTS 生成與模型管理介面 SHALL 支援 API-Key 鑑權。若後端配置了 `VOXCPM_API_KEY` 環境變數，則所有請求必須在 Header 中帶上 `Authorization: Bearer <KEY>`。

#### Scenario: Request without Valid API Key
- **WHEN** 用戶發送推理請求但未提供正確的 API-Key
- **THEN** 伺服器 SHALL 回傳 HTTP 401 Unauthorized 錯誤

### Requirement: Model Download via SSE
後端 SHALL 提供 `/api/model/download` 端點觸發背景下載，並提供 `/api/model/download/stream` 透過 SSE 推送實時下載進度與日誌。

#### Scenario: Check Download Progress
- **WHEN** 前端建立與 `/api/model/download/stream` 的 EventSource 連線且下載正在進行中
- **THEN** 伺服器 SHALL 每秒推送包含當前百分比與下載速度的 JSON 事件數據

### Requirement: TTS Voice Design Inference
後端 SHALL 提供 `/api/tts/design` 端點接收文字與生成參數，執行語音設計推理，並以二進制音訊流回傳產生的 WAV 檔案。

#### Scenario: Design Synthesize Success
- **WHEN** 接收到有效的文字與合理的 CFG、去噪步數參數
- **THEN** 伺服器 SHALL 執行語音合成並回傳 MIME 類型為 `audio/wav` 的音訊數據，並在 Header 中包含產生的 Seed 資訊

### Requirement: TTS Voice Clone Inference
後端 SHALL 提供 `/api/tts/clone` 端點接收參考音檔（Multipart）與文字，執行聲音複製推理，並回傳產生的 WAV 音訊。

#### Scenario: Clone Synthesize Success
- **WHEN** 接收到上傳的 WAV 參考音檔與目標文字
- **THEN** 伺服器 SHALL 執行聲音複製並回傳語音合成的二進制數據

### Requirement: TTS Ultimate Clone Inference
後端 SHALL 提供 `/api/tts/ultimate` 端點接收參考音檔（Multipart）、參考音檔逐字稿與目標文字，執行極限複製推理，並回傳 WAV 音訊。

#### Scenario: Ultimate Clone Success
- **WHEN** 接收到參考音檔、逐字稿以及目標文字
- **THEN** 伺服器 SHALL 執行極限複製推理並以 wav 檔案流回傳結果

