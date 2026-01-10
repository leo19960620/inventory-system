/**
 * 日期工具函數
 */

/**
 * 取得台灣時區的當前日期 (YYYY-MM-DD 格式)
 * @returns {string} 格式化的日期字串
 */
export const getTaiwanDateYMD = () => {
    const formatter = new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';
    return `${year}-${month}-${day}`;
};
