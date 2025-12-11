# 天下客房部庫存管理系統 - 快速部署卡片

## 🚀 Firebase Hosting 部署（推薦）

```bash
# 1. 安裝 Firebase CLI（首次）
npm install -g firebase-tools

# 2. 登入 Firebase
firebase login

# 3. 初始化（首次）
firebase init hosting
# 選項：build | Yes | No

# 4. 建立生產版本
npm run build

# 5. 部署
firebase deploy --only hosting
```

## 📋 更新部署流程

```bash
npm run build
firebase deploy --only hosting
```

## 🌐 部署網址
部署完成後會顯示：
```
Hosting URL: https://your-project.web.app
```

## ⚡ Vercel 部署（替代）

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 登入
vercel login

# 部署
vercel --prod
```

## 🔍 檢查清單
- [ ] `npm run build` 成功
- [ ] Firebase 配置正確
- [ ] 測試本地運行
- [ ] 部署後測試所有功能

---
詳細說明請查看：deployment_guide.md
