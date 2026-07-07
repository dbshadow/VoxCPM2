## ADDED Requirements

### Requirement: Frontend-Driven Batch Processing
在批次合成模式下，前端 SHALL 將文字框內的文字以換行符分割，排除空行後，以異步隊列形式「循序」向後端發送 `/api/tts/design` 請求，避免並行請求導致 GPU 記憶體溢出。

#### Scenario: Run Batch Synthesis
- **WHEN** 用戶在批次模式下點選「開始批次生成」
- **THEN** 系統 SHALL 依序對每一行文字發送 API 請求，並在介面上顯示當前進度（如「第 2/5 句生成中...」）

### Requirement: Batch Action Control
在批次生成執行期間，前端 SHALL 提供「暫停」與「取消」按鈕，允許用戶中斷後續句子的生成。

#### Scenario: Cancel Batch Process
- **WHEN** 用戶在批次生成過程中點選「取消」
- **THEN** 系統 SHALL 立即停止發送下一個 API 請求，並保留已生成的音訊片段

### Requirement: Browser-Side ZIP Package
當所有批次句子生成完畢後，前端 SHALL 在瀏覽器端使用 `JSZip` 將所有生成的音訊 Blob 壓縮打包為單一的 ZIP 檔案，供用戶一鍵下載。

#### Scenario: Download ZIP Archive
- **WHEN** 所有批次句子均成功生成且用戶點選「下載全部音檔」
- **THEN** 系統 SHALL 在瀏覽器端打包生成 ZIP 檔並觸發瀏覽器下載
