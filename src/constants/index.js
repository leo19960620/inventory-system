/**
 * 常數定義
 */

// 每頁顯示的品項數量
export const ITEMS_PER_PAGE = 15;

// 庫存狀態顏色
export const STOCK_COLORS = {
    NEGATIVE: '#8B0000',      // 深紅色 - 異常負庫存
    ZERO: '#C57B7B',          // 柔和紅色 - 零庫存
    LOW: '#D4A574',           // 柔和橙色 - 低庫存警告 (1-5)
    NORMAL: '#5A8F7B'         // 柔和綠色 - 正常庫存
};

// 低庫存警告閾值
export const LOW_STOCK_THRESHOLD = 5;
