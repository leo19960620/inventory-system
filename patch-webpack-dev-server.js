const fs = require('fs');
const path = require('path');

const webpackConfigPath = path.join(
    __dirname,
    'node_modules',
    'react-scripts',
    'config',
    'webpackDevServer.config.js'
);

console.log('正在讀取 webpackDevServer.config.js...');
let content = fs.readFileSync(webpackConfigPath, 'utf8');

// 檢查是否已經修補過
if (content.includes('setupMiddlewares:')) {
    console.log('✓ 檔案已經修補過，無需再次修補');
    process.exit(0);
}

console.log('正在修補棄用的中介軟體選項...');

// 更精確的替換策略
// 找到 onBeforeSetupMiddleware 的開始
const beforeIndex = content.indexOf('onBeforeSetupMiddleware(devServer)');
if (beforeIndex === -1) {
    console.error('✗ 找不到 onBeforeSetupMiddleware');
    process.exit(1);
}

// 找到對應的結束位置（找到 onAfterSetupMiddleware 之後的閉合大括號和逗號）
const afterStart = content.indexOf('onAfterSetupMiddleware(devServer)', beforeIndex);
if (afterStart === -1) {
    console.error('✗ 找不到 onAfterSetupMiddleware');
    process.exit(1);
}

// 尋找 onAfterSetupMiddleware 函數的結束
let braceCount = 0;
let inFunction = false;
let endIndex = afterStart;

for (let i = afterStart; i < content.length; i++) {
    if (content[i] === '{') {
        braceCount++;
        inFunction = true;
    } else if (content[i] === '}') {
        braceCount--;
        if (inFunction && braceCount === 0) {
            // 找到匹配的閉合大括號，繼續尋找逗號
            for (let j = i + 1; j < content.length; j++) {
                if (content[j] === ',') {
                    endIndex = j + 1;
                    break;
                } else if (content[j] !== ' ' && content[j] !== '\n' && content[j] !== '\r') {
                    break;
                }
            }
            break;
        }
    }
}

// 提取要替換的部分
const toReplace = content.substring(beforeIndex, endIndex);

// 新的 setupMiddlewares 配置
const newMiddlewares = `setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      if (fs.existsSync(paths.proxySetup)) {
        require(paths.proxySetup)(devServer.app);
      }

      if (evalSourceMapMiddleware) {
        middlewares.unshift(evalSourceMapMiddleware(devServer));
      }

      if (redirectServedPath) {
        middlewares.unshift(redirectServedPath(paths.publicUrlOrPath));
      }

      if (noopServiceWorkerMiddleware) {
        middlewares.unshift(noopServiceWorkerMiddleware(paths.publicUrlOrPath));
      }

      return middlewares;
    },`;

// 執行替換
const newContent = content.substring(0, beforeIndex) + newMiddlewares + content.substring(endIndex);

// 寫回檔案
fs.writeFileSync(webpackConfigPath, newContent, 'utf8');
console.log('✓ 成功修補 webpackDevServer.config.js');
console.log('✓ 已將 onBeforeSetupMiddleware 和 onAfterSetupMiddleware 替換為 setupMiddlewares');
