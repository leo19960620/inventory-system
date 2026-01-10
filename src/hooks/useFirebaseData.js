import { useState, useEffect, useCallback } from 'react';
import { database } from '../firebase';
import { ref, set, onValue } from 'firebase/database';

/**
 * 統一管理所有 Firebase 資料訂閱的自訂 Hook
 * 提供資料載入狀態和 CRUD 操作函數
 */
export const useFirebaseData = () => {
    // 資料狀態
    const [items, setItems] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [movements, setMovements] = useState([]);
    const [managerAssignments, setManagerAssignments] = useState([]);
    const [combos, setCombos] = useState([]);
    const [managerList, setManagerList] = useState([]);
    const [operatorList, setOperatorList] = useState([]);
    const [unitList, setUnitList] = useState([]);
    const [categoryList, setCategoryList] = useState([]);
    const [loading, setLoading] = useState(true);

    // 通用的 Firebase 儲存函式
    const saveToFirebase = useCallback((collection, data) => {
        try {
            set(ref(database, collection), data);
        } catch (error) {
            console.error(`Error saving to ${collection}:`, error);
            alert(`儲存失敗: ${error.message}`);
        }
    }, []);

    // 監聽 Firebase 資料變化
    useEffect(() => {
        const itemsRef = ref(database, 'items');
        const warehousesRef = ref(database, 'warehouses');
        const movementsRef = ref(database, 'stockMovements');
        const managersRef = ref(database, 'managerList');
        const operatorsRef = ref(database, 'operatorList');
        const unitsRef = ref(database, 'unitList');
        const assignmentsRef = ref(database, 'managerAssignments');
        const categoriesRef = ref(database, 'categoryList');
        const combosRef = ref(database, 'itemCombos');

        const unsubscribeItems = onValue(itemsRef, (snapshot) => {
            const data = snapshot.val();
            setItems(data ? Object.values(data) : []);
        });

        const unsubscribeWarehouses = onValue(warehousesRef, (snapshot) => {
            const data = snapshot.val();
            setWarehouses(data ? Object.values(data) : []);
        });

        const unsubscribeMovements = onValue(movementsRef, (snapshot) => {
            const data = snapshot.val();
            setMovements(data ? Object.values(data) : []);
            setLoading(false);
        });

        const unsubscribeManagers = onValue(managersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setManagerList(data);
        });

        const unsubscribeOperators = onValue(operatorsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setOperatorList(data);
        });

        const unsubscribeUnits = onValue(unitsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setUnitList(data);
        });

        const unsubscribeAssignments = onValue(assignmentsRef, (snapshot) => {
            const data = snapshot.val();
            setManagerAssignments(data ? Object.values(data) : []);
        });

        const unsubscribeCategories = onValue(categoriesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setCategoryList(data);
        });

        const unsubscribeCombos = onValue(combosRef, (snapshot) => {
            const data = snapshot.val();
            setCombos(data ? Object.values(data) : []);
        });

        // 清理函數
        return () => {
            unsubscribeItems();
            unsubscribeWarehouses();
            unsubscribeMovements();
            unsubscribeManagers();
            unsubscribeOperators();
            unsubscribeUnits();
            unsubscribeAssignments();
            unsubscribeCategories();
            unsubscribeCombos();
        };
    }, []);

    // 從 items 提取唯一的分類列表
    useEffect(() => {
        if (items.length > 0) {
            const categories = [...new Set(items.map(item => item.category))].filter(Boolean);
            if (categories.length > 0 && categoryList.length === 0) {
                setCategoryList(categories);
            }
        }
    }, [items, categoryList.length]);

    return {
        // 資料
        items,
        warehouses,
        movements,
        managerAssignments,
        combos,
        managerList,
        operatorList,
        unitList,
        categoryList,
        loading,
        // 操作函數
        saveToFirebase,
        setItems,
        setWarehouses,
        setMovements,
        setManagerAssignments,
        setCombos,
        setManagerList,
        setOperatorList,
        setUnitList,
        setCategoryList
    };
};
