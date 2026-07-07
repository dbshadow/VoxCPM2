## ADDED Requirements

### Requirement: Layout and Navigation
前端 Web UI SHALL 採用響應式導航列，允許用戶在「語音設計」、「聲音複製」、「極限複製」、「系統設定」分頁之間切換。

#### Scenario: Switch Tab
- **WHEN** 用戶在導航列點選「聲音複製」
- **THEN** 畫面 SHALL 切換至聲音複製面板，且原本分頁的輸入內容與狀態仍應被保留

### Requirement: Audio Recording and Visualizer
前端 SHALL 支援使用瀏覽器麥克風進行音訊錄製。在錄音期間，前端 SHALL 使用 Web Audio API 的 `AnalyserNode` 取得即時音量，並在 Canvas 上繪製動態的音波波紋。

#### Scenario: Record Audio and Visualize
- **WHEN** 用戶點選「開始錄音」按鈕並對著麥克風說話
- **THEN** 系統 SHALL 啟動錄製並在畫面上顯示跳動的音波圖，且「開始錄音」按鈕轉變為「停止錄音」

### Requirement: Save System Configurations
前端 SHALL 提供系統設定面板，允許用戶設定「後端 API 地址」與「API-Key」，並將此設定自動持久化儲存於瀏覽器的 `localStorage` 中。

#### Scenario: Update API Endpoint
- **WHEN** 用戶更改後端 API 地址並點選儲存
- **THEN** 系統 SHALL 將該地址寫入 `localStorage`，且後續的所有 API 請求都將送至該新地址
