[English](README.md) | **繁體中文**

# 🎙️ Studio0808 VoxCPM 語音合成工作站

![GitHub License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Python Version](https://img.shields.io/badge/python-3.8%2B-blue.svg)
![Platform](https://img.shields.io/badge/platform-windows-lightgrey.svg)

本專案是基於 OpenBMB 最新開源的 20 億參數語音合成大模型 **VoxCPM2** 所開發的離線桌面 GUI 應用程式。整合了語音設計、聲音複製、極限複製，並配有現場即時錄音測試功能，讓使用者無需撰寫程式碼即可在 Windows 電腦上體驗高品質的 AI 語音生成。

---

## 🌟 主要特色與核心功能

### 1. 🎤 即時錄音測試 (Live Voice Recording) (NEW!)
* **麥克風動態選取**：動態偵測並列出系統中所有可用的音訊輸入設備。
* **即時音波波形**：內建音量波形視覺化，錄音時可在畫面上即時看到粉紅波紋跳動，確保聲音正常錄入。
* **一鍵套用**：錄音完後，可點選按鈕直接將該 WAV 音檔與對應的逐字稿套用至「聲音複製」或「極限複製」分頁中。

### 2. ✨ 語音設計 (Voice Design)
* **無中生有**：無需任何參考音檔，直接在輸入文字開頭加上括號並輸入英文特徵描述（如 `(A gentle young female voice, smiling)`），即可創造出完全符合描述的獨特人聲。
* **快速預設面板**：內建台灣國語、日語、英語、韓語等十餘種精美預設音色範本，點擊即可快速套用。
* **📋 批次合成 (有聲書神器)**：可將長文章或小說分行輸入（一行一句），系統會自動在背景逐句合成為單獨的音檔，防止記憶體溢出或大模型長上下文崩潰。

### 3. 👥 聲音複製 (Voice Clone)
* **極短參考音**：僅需 3~10 秒乾淨的人聲錄音，即可快速模仿該發音人的音色特徵。
* **隨機 Take 生成**：預設不固定隨機種子，每次生成音色不變，但說話的語氣、停頓與停頓間隔皆有不同，方便您挑選最生動的版本。

### 4. 👑 極限複製 (Ultimate Clone)
* **無縫接續**：同時提供參考音檔與該音檔的**對應逐字稿**。模型會將這段語音作為時間線的前文，百分之百無縫延續說出您的目標文字，完美繼承發音人原本的呼吸、語調起伏、環境雜音與情感。

---

## ⚙️ 系統需求與建議

* **作業系統**：Windows 10/11 (64-bit)
* **Python 版本**：Python 3.8 ~ 3.11 
* **硬體建議**：
  * 模型參數量為 2B (約 20 億參數)，主模型權重大小約 4.63 GB。
  * 建議配備有 **NVIDIA 顯示卡 (VRAM 建議 >= 6GB)** 並安裝 CUDA 環境以啟用 GPU 加速，可達到秒級生成的極速體驗。
  * 若無 GPU，程式會自動切換為 CPU 模式運行（生成速度會慢約數十倍）。

---

## 🚀 快速安裝與啟動

### 1. 克隆本專案
```bash
git clone https://github.com/您的帳號/Studio0808_VoxCPM.git
cd Studio0808_VoxCPM
```

### 2. 安裝依賴套件
強烈建議使用 Anaconda 或 venv 建立乾淨的虛擬環境。
```bash
pip install -r requirements.txt
```

### 3. 啟動程式
```bash
python Studio0808_VoxCPM.py
```

---

## 📂 模型部署說明 (第一次使用)

本工作站為**全離線運行**，不會將任何語音或文字上傳至雲端。
1. 開啟程式後，切換至 **「系統設定」** 分頁。
2. 選擇下載伺服器來源：
   * **Hugging Face 官方**（海外或台灣地區推薦，頻寬最高）
   * **ModelScope / 鏡像站**（中國大陸地區推薦）
3. 點選 **「開始下載 / 檢查模型」**。
4. 下載程式支援** Range 斷點續傳與自動重試機制**，如中途網路不穩，再次點擊即可在原進度續傳，下載完成後程式便能完全離線運作。

---

## 🖥️ 前後端分離 (Web API) 部署指引 (NEW!)

為了降低本機硬體限制，本專案現已支援**前後端分離部署**：將耗費 GPU 資源的模型推理部署在遠端 NVIDIA GPU 伺服器，並透過任何公開網路上的 Web 瀏覽器進行操作。

### 1. 🚀 後端部署 (配備 GPU 伺服器)
後端基於 FastAPI 框架，建議使用 **Docker** 進行一鍵部署。

#### 方式 A：使用 Docker Compose (推薦)
1. 確保伺服器已安裝 `docker`、`docker-compose` 與 `nvidia-container-toolkit`。
2. 切換至後端目錄：
   ```bash
   cd backend
   ```
3. 在 `docker-compose.yml` 中根據需求修改環境變數（如 `VOXCPM_API_KEY` 金鑰以保護您的 GPU 運算資源）。
4. 啟動容器：
   ```bash
   docker compose up -d --build
   ```
5. 後端服務將啟動於 `http://<您的伺服器IP>:8000`。

#### 方式 B：手動啟動 (Python 虛擬環境)
1. 安裝後端專屬依賴：
   ```bash
   pip install -r backend/requirements.txt
   ```
2. 啟動 Uvicorn 服務：
   ```bash
   python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
   ```

---

### 2. 🌐 前端部署 (公開網路)
前端基於 Vite + React + Tailwind CSS。

1. 切換至前端目錄：
   ```bash
   cd frontend
   ```
2. 安裝依賴並編譯為靜態 HTML/JS 檔案：
   ```bash
   npm install
   npm run build
   ```
3. 將產生的 `dist/` 資料夾部署至任何靜態託管平台（如 Vercel, Netlify, Github Pages, Cloudflare Pages 等）。
4. **設定與連線**：
   - 開啟網頁後，進入 **「系統設定」** 分頁。
   - 輸入您的後端 API 位址（如 `http://<GPU_IP>:8000`）與 API-Key（如有配置）。設定會自動儲存於瀏覽器本地 `localStorage` 中。

> [!IMPORTANT]
> **Mixed Content (HTTPS 與 HTTP 混合安全性問題)**：
> 如果您的前端部署在 Vercel 等平台且走 **HTTPS** 安全協議，而您的 GPU 後端只走 **HTTP**，瀏覽器會安全起見阻擋請求。
> **解決方案**：
> 1. 在 GPU 後端伺服器上安裝 Nginx 並配置 SSL 憑證；或
> 2. 使用 **Cloudflare Tunnels** (`cloudflared`) 將後端 8000 連接埠安全暴露，這會自動提供免費的 HTTPS 域名，最為推薦。

---

## ❓ 實戰微調技巧 (FAQ)

### Q：合成時，字唸錯了（例如多音字、生僻字唸錯）怎麼辦？
* **同音字替換**：因為輸入的目標文字僅用於 AI 合成語音，聽眾只會聽到聲音、看不到文字。
* **實例**：
  * 模型若將「連**假**」讀成三聲的「連甲」，可將文字修改為 **「連架」** 或 **「連價」** 即可強行唸出四聲。
  * 若生僻字「狂**飆**」唸錯，可將其改為同音常見字 **「狂標」** 即可。

### Q：語音複製的最佳錄音長度是多久？
* **3~10 秒為黃金長度**：錄音時間並非越長越好。過長的參考語音（例如超過 30 秒）會大幅占用自迴歸模型的注意力窗口，反而容易導致生成後半段文字時出現跳針、胡言亂語或提早中斷等問題。請優先使用 5~8 秒、乾淨無背景音樂且說話清晰的短語音。

---

## 📜 聲明與授權

* 本專案底層採用 OpenBMB 開源之 [VoxCPM2](https://github.com/OpenBMB/VoxCPM) 模型，該模型依 **Apache License 2.0** 協議授權。
* 本工具僅供學術研究、測試與技術評估之用，請遵守相關法律法規，切勿將合成的語音用於非法或未授權之傳播。
* 版權所有 © 2026 Studio0808.
