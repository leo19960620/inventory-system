/**
 * 庫存計算相關工具函數
 */

import { STOCK_COLORS, LOW_STOCK_THRESHOLD } from '../constants';

/**
 * 計算單一物品在單一倉庫的庫存
 * @param {string} itemId - 物品 ID
 * @param {string} warehouseId - 倉庫 ID
 * @param {Array} movements - 異動記錄陣列
 * @returns {number} 庫存數量
 */
export const calculateStock = (itemId, warehouseId, movements) => {
    const itemMovements = movements.filter(
        m => m.itemId === itemId && m.warehouseId === warehouseId
    );

    let stock = 0;
    itemMovements.forEach(m => {
        // 根據異動類型計算庫存
        if (m.type === '入庫' || m.type === '調整') {
            stock += m.quantity;
        } else if (m.type === '出庫') {
            stock -= Math.abs(m.quantity);
        } else if (m.type === '調撥') {
            // 調撥記錄中,quantity 已經帶正負號
            stock += m.quantity;
        }
    });

    return stock;
};

/**
 * 計算物品的總庫存(所有倉庫)
 * @param {string} itemId - 物品 ID
 * @param {Array} warehouses - 倉庫陣列
 * @param {Array} movements - 異動記錄陣列
 * @returns {number} 總庫存數量
 */
export const calculateTotalStock = (itemId, warehouses, movements) => {
    return warehouses.reduce((total, wh) => {
        return total + calculateStock(itemId, wh.id, movements);
    }, 0);
};

/**
 * 取得物品的管理者
 * @param {string} itemId - 物品 ID
 * @param {Array} items - 物品陣列
 * @param {Array} warehouses - 倉庫陣列
 * @param {Array} managerAssignments - 管理者分配陣列
 * @param {Array} movements - 異動記錄陣列
 * @returns {string} 管理者名稱
 */
export const getItemManager = (itemId, items, warehouses, managerAssignments, movements) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return '-';

    // 找出有庫存的倉庫
    const warehousesWithStock = warehouses.filter(w => w.isActive && calculateStock(itemId, w.id, movements) !== 0);

    // 1. 最優先: 查找倉庫+分類組合 (最精確)
    for (const wh of warehousesWithStock) {
        const combinedAssignment = managerAssignments.find(
            a => a.type === 'combined' &&
                a.warehouseId === wh.id &&
                a.category === item.category
        );
        if (combinedAssignment) return combinedAssignment.manager;
    }

    // 2. 次優先: 查找分類管理者
    const categoryAssignment = managerAssignments.find(a => a.type === 'category' && a.category === item.category);
    if (categoryAssignment) return categoryAssignment.manager;

    // 3. 最後: 查找倉庫管理者(找第一個有庫存的倉庫的管理者)
    for (const wh of warehousesWithStock) {
        const warehouseAssignment = managerAssignments.find(a => a.type === 'warehouse' && a.warehouseId === wh.id);
        if (warehouseAssignment) return warehouseAssignment.manager;
    }

    return '-';
};

/**
 * 取得物品的所有管理者及負責倉庫
 * @param {string} itemId - 物品 ID
 * @param {Array} items - 物品陣列
 * @param {Array} warehouses - 倉庫陣列
 * @param {Array} managerAssignments - 管理者分配陣列
 * @param {Array} movements - 異動記錄陣列
 * @returns {Array} 管理者列表 [{manager, warehouses: []}]
 */
export const getAllManagers = (itemId, items, warehouses, managerAssignments, movements) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return [];

    const managerMap = new Map(); // {manager: [warehouseNames]}

    // 找出有庫存的倉庫
    const warehousesWithStock = warehouses.filter(w => w.isActive && calculateStock(itemId, w.id, movements) !== 0);

    warehousesWithStock.forEach(wh => {
        let managerFound = false;

        // 1. 優先: 倉庫+分類組合
        const combinedAssignment = managerAssignments.find(
            a => a.type === 'combined' && a.warehouseId === wh.id && a.category === item.category
        );
        if (combinedAssignment) {
            managerFound = true;
            const current = managerMap.get(combinedAssignment.manager) || [];
            managerMap.set(combinedAssignment.manager, [...current, wh.name]);
        }

        // 2. 次優先: 倉庫管理者
        if (!managerFound) {
            const warehouseAssignment = managerAssignments.find(
                a => a.type === 'warehouse' && a.warehouseId === wh.id
            );
            if (warehouseAssignment) {
                managerFound = true;
                const current = managerMap.get(warehouseAssignment.manager) || [];
                managerMap.set(warehouseAssignment.manager, [...current, wh.name]);
            }
        }

        // 3. 最後: 分類管理者
        if (!managerFound) {
            const categoryAssignment = managerAssignments.find(
                a => a.type === 'category' && a.category === item.category
            );
            if (categoryAssignment) {
                const current = managerMap.get(categoryAssignment.manager) || [];
                managerMap.set(categoryAssignment.manager, [...current, wh.name]);
            }
        }
    });

    return Array.from(managerMap, ([manager, warehouses]) => ({
        manager,
        warehouses
    }));
};

/**
 * 取得庫存警告顏色(圓點背景色)
 * @param {number} stock - 庫存數量
 * @returns {string} 顏色代碼
 */
export const getStockDotColor = (stock) => {
    if (stock < 0) return STOCK_COLORS.NEGATIVE;
    if (stock === 0) return STOCK_COLORS.ZERO;
    if (stock > 0 && stock <= LOW_STOCK_THRESHOLD) return STOCK_COLORS.LOW;
    return STOCK_COLORS.NORMAL;
};

/**
 * 取得倉庫分佈顏色樣式類別
 * @param {number} stock - 庫存數量
 * @returns {string} CSS 類別字串
 */
export const getWarehouseStockClass = (stock) => {
    if (stock < 0) return 'bg-red-600 text-white';
    if (stock === 0) return 'bg-gray-200 text-gray-700';
    return 'bg-green-100 text-green-800';
};
