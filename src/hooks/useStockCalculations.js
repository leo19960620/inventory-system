import { useMemo, useCallback } from 'react';
import {
    calculateStock as calcStock,
    calculateTotalStock as calcTotalStock,
    getItemManager as getManager,
    getAllManagers as getManagers,
    getStockDotColor,
    getWarehouseStockClass
} from '../utils/stockCalculations';

/**
 * 封裝庫存計算邏輯的自訂 Hook
 * 使用 useMemo 優化效能
 */
export const useStockCalculations = (items, warehouses, movements, managerAssignments) => {
    // 封裝 calculateStock 為 useCallback
    const calculateStock = useCallback((itemId, warehouseId) => {
        return calcStock(itemId, warehouseId, movements);
    }, [movements]);

    // 封裝 calculateTotalStock 為 useCallback
    const calculateTotalStock = useCallback((itemId) => {
        return calcTotalStock(itemId, warehouses, movements);
    }, [warehouses, movements]);

    // 封裝 getItemManager 為 useCallback
    const getItemManager = useCallback((itemId) => {
        return getManager(itemId, items, warehouses, managerAssignments, movements);
    }, [items, warehouses, managerAssignments, movements]);

    // 封裝 getAllManagers 為 useCallback
    const getAllManagers = useCallback((itemId) => {
        return getManagers(itemId, items, warehouses, managerAssignments, movements);
    }, [items, warehouses, managerAssignments, movements]);

    // 計算倉庫分佈 (包含零庫存和負庫存)
    const getWarehouseDistribution = useCallback((itemId) => {
        const filteredWarehouses = warehouses.filter(w => w.isActive);

        return filteredWarehouses
            .map(wh => ({ warehouse: wh, stock: calculateStock(itemId, wh.id) }))
            .filter(item => {
                // 顯示所有有異動記錄的倉庫
                const hasMovements = movements.some(m => m.itemId === itemId && m.warehouseId === item.warehouse.id);
                return hasMovements;
            });
    }, [warehouses, movements, calculateStock]);

    // 使用 useMemo 緩存分類列表
    const categories = useMemo(() => {
        return [...new Set(items.map(item => item.category))].filter(Boolean);
    }, [items]);

    // 使用 useMemo 緩存部門列表
    const departments = useMemo(() => {
        return [...new Set(warehouses.map(wh => wh.department))].filter(Boolean);
    }, [warehouses]);

    // 使用 useMemo 緩存管理者列表
    const managers = useMemo(() => {
        return [...new Set(managerAssignments.map(a => a.manager))].filter(Boolean);
    }, [managerAssignments]);

    return {
        // 計算函數
        calculateStock,
        calculateTotalStock,
        getItemManager,
        getAllManagers,
        getWarehouseDistribution,
        // 顏色函數
        getStockDotColor,
        getWarehouseStockClass,
        // 緩存的列表
        categories,
        departments,
        managers
    };
};
