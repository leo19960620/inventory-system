import React, { useState, useCallback } from 'react';
import { Plus, FileText, History, Warehouse, TrendingUp, Edit2, Trash2, AlertCircle, Users, Package } from 'lucide-react';
import { database } from './firebase';
import { ref, get } from 'firebase/database';
import toast, { Toaster } from 'react-hot-toast';
import './App.css';

// 通用元件


// Modal 元件
import GuideModal from './components/modals/GuideModal';
import ItemModal from './components/modals/ItemModal';
import WarehouseModal from './components/modals/WarehouseModal';
import MovementModal from './components/modals/MovementModal';
import BatchMovementModal from './components/modals/BatchMovementModal';
import ComboModal from './components/modals/ComboModal';

// 自訂 Hooks
import { useFirebaseData } from './hooks/useFirebaseData';
import { useStockCalculations } from './hooks/useStockCalculations';

// 工具函數
import { getTaiwanDateYMD } from './utils/dateUtils';

// 常數



/**
 * 多倉庫庫存管理系統
 * 
 * 架構說明：
 * 1. Item（物品）- 只存物品基本資訊，不含庫存
 * 2. Warehouse（倉庫）- 倉庫主檔
 * 3. StockMovement（庫存異動）- 所有庫存變動記錄
 * 4. ManagerAssignment（管理者分配）- 管理者權限設定
 * 
 * 庫存計算：庫存 = SUM(異動記錄的數量)
 */

const MultiWarehouseInventorySystem = () => {
  // ==================== 使用自訂 Hooks ====================
  // Firebase 資料管理
  const {
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
    saveToFirebase
  } = useFirebaseData();

  // 庫存計算邏輯
  const {
    calculateStock,
    calculateTotalStock,
    getItemManager,
    getAllManagers,
    getWarehouseDistribution,
    getStockDotColor,

  } = useStockCalculations(items, warehouses, movements, managerAssignments);

  // ==================== UI 狀態 ====================
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal 狀態
  const [showItemModal, setShowItemModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showBatchMovementModal, setShowBatchMovementModal] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [editingCombo, setEditingCombo] = useState(null);

  // 總覽頁面篩選和分頁
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedManager, setSelectedManager] = useState('ALL');
  const [overviewPage, setOverviewPage] = useState(1);
  const [selectedItemForMovement, setSelectedItemForMovement] = useState(null);

  // 異動紀錄篩選狀態
  const [movementSearchTerm, setMovementSearchTerm] = useState('');
  const [movementWarehouse, setMovementWarehouse] = useState('ALL');
  const [movementType, setMovementType] = useState('ALL');
  const [movementOperator, setMovementOperator] = useState('ALL');
  const [movementStartDate, setMovementStartDate] = useState('');
  const [movementEndDate, setMovementEndDate] = useState('');
  const [movementPage, setMovementPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const MOVEMENTS_PER_PAGE = 50;

  // 列印相關狀態
  const [printConfig, setPrintConfig] = useState({ frequency: '', rangeType: 'all', rangeValue: '' });

  // ==================== CRUD 操作函數 ====================

  /**
   * FIFO（先進先出）效期管理
   * 取得物品在倉庫中的庫存，按效期排序
   * @param {string} itemId
   * @param {string} warehouseId
   * @returns {Array} 庫存批次列表 [{expiryDate, quantity}]
   */
  // eslint-disable-next-line no-unused-vars
  const getStockBatchesByFIFO = useCallback((itemId, warehouseId) => {
    const itemMovements = movements.filter(
      m => m.itemId === itemId && m.warehouseId === warehouseId && m.expiryDate
    ).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    const batches = new Map();
    itemMovements.forEach(m => {
      const key = m.expiryDate;
      if (!batches.has(key)) {
        batches.set(key, 0);
      }
      if (m.type === '入庫') {
        batches.set(key, batches.get(key) + m.quantity);
      } else if (m.type === '出庫') {
        batches.set(key, batches.get(key) - Math.abs(m.quantity));
      }
    });

    return Array.from(batches.entries())
      .filter(([_, qty]) => qty > 0)
      .map(([expiry, qty]) => ({ expiryDate: expiry, quantity: qty }));
  }, [movements]);

  // ==================== 物品管理函數 ====================

  const handleSaveItem = async (itemData) => {
    try {
      const itemId = itemData.id || `item_${Date.now()}`;
      const item = {
        id: itemId,
        name: itemData.name,
        category: itemData.category,
        frequency: itemData.frequency,
        unit: itemData.unit,
        createdAt: itemData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const snapshot = await get(ref(database, 'items'));
      const existingItems = snapshot.val() || {};
      existingItems[itemId] = item;

      saveToFirebase('items', existingItems);
      setShowItemModal(false);
      setEditingItem(null);
      toast.success('物品儲存成功！');
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('儲存物品失敗：' + error.message);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('確定要刪除此物品嗎？此操作將同時刪除所有相關的庫存異動記錄。')) return;

    try {
      // 刪除物品
      const itemsSnapshot = await get(ref(database, 'items'));
      const items = itemsSnapshot.val() || {};
      delete items[itemId];
      saveToFirebase('items', items);

      // 刪除相關異動記錄
      const movementsSnapshot = await get(ref(database, 'stockMovements'));
      const allMovements = movementsSnapshot.val() || {};
      const filteredMovements = {};
      Object.entries(allMovements).forEach(([key, mov]) => {
        if (mov.itemId !== itemId) {
          filteredMovements[key] = mov;
        }
      });
      saveToFirebase('stockMovements', filteredMovements);
      toast.success('物品已刪除');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('刪除失敗：' + error.message);
    }
  };

  // ==================== 倉庫管理函數 ====================

  const handleSaveWarehouse = async (warehouseData) => {
    try {
      const warehouseId = warehouseData.id || `warehouse_${Date.now()}`;
      const warehouse = {
        id: warehouseId,
        code: warehouseData.code,
        name: warehouseData.name,
        floor: warehouseData.floor,
        department: warehouseData.department,
        isActive: warehouseData.isActive !== false,
        createdAt: warehouseData.createdAt || new Date().toISOString()
      };

      const snapshot = await get(ref(database, 'warehouses'));
      const existingWarehouses = snapshot.val() || {};
      existingWarehouses[warehouseId] = warehouse;

      saveToFirebase('warehouses', existingWarehouses);
      setShowWarehouseModal(false);
      setEditingWarehouse(null);
      toast.success('倉庫儲存成功！');
    } catch (error) {
      console.error('Error saving warehouse:', error);
      toast.error('儲存倉庫失敗：' + error.message);
    }
  };

  const handleDeleteWarehouse = async (warehouseId) => {
    if (!window.confirm('確定要刪除此倉庫嗎？此操作將同時刪除所有相關的庫存異動記錄。')) {
      return;
    }

    try {
      const warehousesSnapshot = await get(ref(database, 'warehouses'));
      const warehouses = warehousesSnapshot.val() || {};
      delete warehouses[warehouseId];
      saveToFirebase('warehouses', warehouses);

      // 刪除相關異動記錄
      const movementsSnapshot = await get(ref(database, 'stockMovements'));
      const allMovements = movementsSnapshot.val() || {};
      const filteredMovements = {};
      Object.entries(allMovements).forEach(([key, mov]) => {
        if (mov.warehouseId !== warehouseId) {
          filteredMovements[key] = mov;
        }
      });
      saveToFirebase('stockMovements', filteredMovements);
      toast.success('倉庫已刪除');
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      toast.error('刪除失敗：' + error.message);
    }
  };

  // ==================== 庫存異動函數 ====================

  /**
   * 建立庫存異動記錄
   * @param {Object} movementData - 異動資料
   */
  const handleCreateMovement = async (movementData) => {
    try {
      const movementId = `movement_${Date.now()}`;
      const item = items.find(i => i.id === movementData.itemId);
      const warehouse = warehouses.find(w => w.id === movementData.warehouseId);

      const movement = {
        id: movementId,
        itemId: movementData.itemId,
        itemName: item?.name || '',
        warehouseId: movementData.warehouseId,
        warehouseName: warehouse?.name || '',
        type: movementData.type,
        quantity: movementData.quantity,
        expiryDate: movementData.expiryDate || null,
        date: movementData.date || getTaiwanDateYMD(),
        note: movementData.note || '',
        operator: movementData.operator || '系統',
        createdAt: new Date().toISOString()
      };

      const snapshot = await get(ref(database, 'stockMovements'));
      const existingMovements = snapshot.val() || {};
      existingMovements[movementId] = movement;

      saveToFirebase('stockMovements', existingMovements);
      setShowMovementModal(false);
      toast.success('異動記錄已建立！');
    } catch (error) {
      console.error('Error creating movement:', error);
      toast.error('建立異動記錄失敗：' + error.message);
    }
  };

  /**
   * 調撥操作（一筆操作產生兩筆異動記錄）
   * @param {Object} transferData - 調撥資料
   */
  const handleTransfer = async (transferData) => {
    try {
      const timestamp = Date.now();
      const item = items.find(i => i.id === transferData.itemId);
      const fromWarehouse = warehouses.find(w => w.id === transferData.fromWarehouseId);
      const toWarehouse = warehouses.find(w => w.id === transferData.toWarehouseId);

      // 記錄 1：從源倉庫出庫（負數）
      const outMovement = {
        id: `movement_${timestamp}_out`,
        itemId: transferData.itemId,
        itemName: item?.name || '',
        warehouseId: transferData.fromWarehouseId,
        warehouseName: fromWarehouse?.name || '',
        type: '調撥',
        quantity: -Math.abs(transferData.quantity),
        expiryDate: transferData.expiryDate || null,
        date: transferData.date || getTaiwanDateYMD(),
        note: `調撥至 ${toWarehouse?.name}`,
        operator: transferData.operator || '系統',
        targetWarehouseId: transferData.toWarehouseId,
        targetWarehouseName: toWarehouse?.name || '',
        linkedMovementId: `movement_${timestamp}_in`,
        createdAt: new Date().toISOString()
      };

      // 記錄 2：到目標倉庫入庫（正數）
      const inMovement = {
        id: `movement_${timestamp}_in`,
        itemId: transferData.itemId,
        itemName: item?.name || '',
        warehouseId: transferData.toWarehouseId,
        warehouseName: toWarehouse?.name || '',
        type: '調撥',
        quantity: Math.abs(transferData.quantity),
        expiryDate: transferData.expiryDate || null,
        date: transferData.date || getTaiwanDateYMD(),
        note: `從 ${fromWarehouse?.name} 調入`,
        operator: transferData.operator || '系統',
        targetWarehouseId: transferData.fromWarehouseId,
        targetWarehouseName: fromWarehouse?.name || '',
        linkedMovementId: `movement_${timestamp}_out`,
        createdAt: new Date().toISOString()
      };

      const snapshot = await get(ref(database, 'stockMovements'));
      const existingMovements = snapshot.val() || {};
      existingMovements[`movement_${timestamp}_out`] = outMovement;
      existingMovements[`movement_${timestamp}_in`] = inMovement;

      saveToFirebase('stockMovements', existingMovements);
      setShowMovementModal(false);
      toast.success('調撥操作完成！');
    } catch (error) {
      console.error('Error creating transfer:', error);
      toast.error('調撥失敗：' + error.message);
    }
  };

  /**
   * 批次建立異動記錄（異動單）
   * @param {Object} batchData - 異動單資料
   */
  const handleCreateBatchMovement = async (batchData) => {
    try {
      const { type, items, warehouseId, toWarehouseId, date, note, operator } = batchData;

      if (type === '調撥') {
        // 調撥類型：為每個物品呼叫 handleTransfer
        for (const item of items) {
          await handleTransfer({
            itemId: item.itemId,
            fromWarehouseId: warehouseId,
            toWarehouseId: toWarehouseId,
            quantity: item.quantity,
            date: date,
            note: note,
            operator: operator
          });
        }
      } else {
        // 一般類型（入庫/出庫/調整）：為每個物品呼叫 handleCreateMovement
        for (const item of items) {
          let quantity = item.quantity;

          // 出庫需要轉換為負數
          if (type === '出庫') {
            quantity = -Math.abs(quantity);
          }

          await handleCreateMovement({
            itemId: item.itemId,
            warehouseId: warehouseId,
            type: type,
            quantity: quantity,
            date: date,
            note: note,
            operator: operator
          });
        }
      }

      setShowBatchMovementModal(false);
      toast.success(`已成功建立 ${items.length} 筆異動記錄！`);
    } catch (error) {
      console.error('Error creating batch movement:', error);
      toast.error('建立異動單失敗：' + error.message);
    }
  };

  // ==================== 管理者分配管理函數 ====================

  const handleSaveManagerAssignment = async (assignmentData) => {
    try {
      const timestamp = Date.now();
      const assignmentId = assignmentData.id || `assignment_${timestamp}`;

      const newAssignment = {
        id: assignmentId,
        manager: assignmentData.manager,
        type: assignmentData.type, // 'category', 'warehouse', or 'combined'
        ...(assignmentData.type === 'category' && { category: assignmentData.category }),
        ...(assignmentData.type === 'warehouse' && { warehouseId: assignmentData.warehouseId }),
        ...(assignmentData.type === 'combined' && {
          warehouseId: assignmentData.warehouseId,
          category: assignmentData.category
        })
      };

      const assignmentsSnapshot = await get(ref(database, 'managerAssignments'));
      const existingAssignments = assignmentsSnapshot.val() || {};

      existingAssignments[assignmentId] = newAssignment;
      await saveToFirebase('managerAssignments', existingAssignments);

      setShowManagerModal(false);
      setEditingAssignment(null);
      toast.success('管理者分配已儲存！');
    } catch (error) {
      console.error('Error saving manager assignment:', error);
      toast.error('儲存管理者分配失敗：' + error.message);
    }
  };

  const handleDeleteManagerAssignment = async (assignmentId) => {
    if (!window.confirm('確定要刪除此管理者分配嗎？')) {
      return;
    }

    try {
      const assignmentsSnapshot = await get(ref(database, 'managerAssignments'));
      const assignments = assignmentsSnapshot.val() || {};
      delete assignments[assignmentId];
      await saveToFirebase('managerAssignments', assignments);
      toast.success('管理者分配已刪除');
    } catch (error) {
      console.error('Error deleting manager assignment:', error);
      toast.error('刪除管理者分配失敗：' + error.message);
    }
  };


  // ==================== 組合管理函數 ====================

  const handleSaveCombo = async (comboData) => {
    try {
      const timestamp = Date.now();
      const comboId = editingCombo?.id || `combo_${timestamp}`;

      const combo = {
        id: comboId,
        name: comboData.name,
        description: comboData.description || '',
        items: comboData.items,
        createdAt: editingCombo?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const combosSnapshot = await get(ref(database, 'itemCombos'));
      const existingCombos = combosSnapshot.val() || {};
      existingCombos[comboId] = combo;

      await saveToFirebase('itemCombos', existingCombos);
      setShowComboModal(false);
      setEditingCombo(null);
      toast.success(editingCombo ? '組合已更新！' : '組合已建立！');
    } catch (error) {
      console.error('Error saving combo:', error);
      toast.error('儲存組合失敗：' + error.message);
    }
  };

  const handleDeleteCombo = async (comboId) => {
    if (!window.confirm('確定要刪除此組合嗎？')) {
      return;
    }

    try {
      const combosSnapshot = await get(ref(database, 'itemCombos'));
      const allCombos = combosSnapshot.val() || {};
      delete allCombos[comboId];
      await saveToFirebase('itemCombos', allCombos);
      toast.success('組合已刪除');
    } catch (error) {
      console.error('Error deleting combo:', error);
      toast.error('刪除組合失敗：' + error.message);
    }
  };


  // ==================== 單位和操作人員管理函數 ====================

  const handleAddUnit = async (newUnit) => {
    try {
      if (!newUnit || unitList.includes(newUnit)) {
        return; // 已存在或空值,不處理
      }

      const updatedUnitList = [...unitList, newUnit];
      await saveToFirebase('unitList', updatedUnitList);
      toast.success(`新單位「${newUnit}」已加入清單`);
    } catch (error) {
      console.error('Error adding unit:', error);
      toast.error('新增單位失敗：' + error.message);
    }
  };

  const handleAddOperator = async (newOperator) => {
    try {
      if (!newOperator || operatorList.includes(newOperator)) {
        return; // 已存在或空值,不處理
      }

      const updatedOperatorList = [...operatorList, newOperator];
      await saveToFirebase('operatorList', updatedOperatorList);
      toast.success(`新操作人員「${newOperator}」已加入清單`);
    } catch (error) {
      console.error('Error adding operator:', error);
      toast.error('新增操作人員失敗:' + error.message);
    }
  };

  const handleAddCategory = async (newCategory) => {
    try {
      if (!newCategory || categoryList.includes(newCategory)) {
        return; // 已存在或空值,不處理
      }

      const updatedCategoryList = [...categoryList, newCategory];
      await saveToFirebase('categoryList', updatedCategoryList);
      toast.success(`新分類「${newCategory}」已加入清單`);
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('新增分類失敗:' + error.message);
    }
  };

  // ==================== 渲染主介面 ====================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--color-accent)' }}></div>
          <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* 頂部導航欄 */}
      <nav style={{ backgroundColor: 'var(--bg-white)', boxShadow: 'var(--shadow-sm)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="max-w-7xl mx-auto" style={{ padding: '0 var(--spacing-lg)' }}>
          <div className="flex justify-between items-center" style={{ height: '72px' }}>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
              <h1 style={{
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-semibold)',
                color: 'var(--color-primary)',
                letterSpacing: '-0.5px'
              }}>天下客房部庫存管理</h1>
            </div>
            <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
              <button
                onClick={() => setActiveTab('overview')}
                style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-medium)',
                  backgroundColor: activeTab === 'overview' ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === 'overview' ? 'var(--bg-white)' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'var(--transition-base)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => { if (activeTab !== 'overview') { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                onMouseLeave={(e) => { if (activeTab !== 'overview') { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
              >
                <TrendingUp className="w-4 h-4" />
                庫存總覽
              </button>
              <button
                onClick={() => setActiveTab('warehouses')}
                style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-medium)',
                  backgroundColor: activeTab === 'warehouses' ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === 'warehouses' ? 'var(--bg-white)' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'var(--transition-base)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => { if (activeTab !== 'warehouses') { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                onMouseLeave={(e) => { if (activeTab !== 'warehouses') { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
              >
                <Warehouse className="w-4 h-4" />
                倉庫管理
              </button>
              <button
                onClick={() => setActiveTab('movements')}
                style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-medium)',
                  backgroundColor: activeTab === 'movements' ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === 'movements' ? 'var(--bg-white)' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'var(--transition-base)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => { if (activeTab !== 'movements') { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                onMouseLeave={(e) => { if (activeTab !== 'movements') { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
              >
                <History className="w-4 h-4" />
                異動記錄
              </button>
              <button
                onClick={() => setActiveTab('managers')}
                style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-medium)',
                  backgroundColor: activeTab === 'managers' ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === 'managers' ? 'var(--bg-white)' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'var(--transition-base)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => { if (activeTab !== 'managers') { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                onMouseLeave={(e) => { if (activeTab !== 'managers') { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
              >
                <Users className="w-4 h-4" />
                管理者設定
              </button>
              <button
                onClick={() => setActiveTab('combos')}
                style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-medium)',
                  backgroundColor: activeTab === 'combos' ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === 'combos' ? 'var(--bg-white)' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'var(--transition-base)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => { if (activeTab !== 'combos') { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                onMouseLeave={(e) => { if (activeTab !== 'combos') { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
              >
                <Package className="w-4 h-4" />
                組合管理
              </button>
              <button
                onClick={() => setShowGuideModal(true)}
                style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-medium)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-light)',
                  cursor: 'pointer',
                  transition: 'var(--transition-base)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => { e.target.style.backgroundColor = 'var(--bg-secondary)'; e.target.style.borderColor = 'var(--border-medium)' }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.borderColor = 'var(--border-light)' }}
              >
                <FileText className="w-4 h-4" style={{ color: activeTab === 'items' ? 'var(--bg-white)' : 'var(--text-secondary)' }} />
                使用說明
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要內容區 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">庫存總覽</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setShowItemModal(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  新增物品
                </button>
                <button
                  onClick={() => setShowBatchMovementModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  新增異動單
                </button>
                <button
                  onClick={() => setShowPrintModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  列印盤點表
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">搜尋物品名稱</label>
                  <input type="text" placeholder="輸入物品名稱..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setOverviewPage(1); }} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">選擇部門</label>
                  <select value={selectedDepartment} onChange={(e) => { setSelectedDepartment(e.target.value); setOverviewPage(1); }} className="w-full px-4 py-2 border rounded-lg">
                    <option value="ALL">全部部門</option>
                    <option value="櫃檯">櫃檯</option>
                    <option value="服中">服中</option>
                    <option value="倉庫">倉庫</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">選擇分類</label><select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setOverviewPage(1); }} className="w-full px-4 py-2 border rounded-lg"><option value="">全部分類</option><option value="ALL">全部</option>{categoryList.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">選擇倉庫</label><select value={selectedWarehouse} onChange={(e) => { setSelectedWarehouse(e.target.value); setOverviewPage(1); }} className="w-full px-4 py-2 border rounded-lg"><option value="ALL">全部</option>{warehouses.filter(w => w.isActive && (selectedDepartment === 'ALL' || w.department === selectedDepartment)).map(wh => <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">選擇管理者</label><select value={selectedManager} onChange={(e) => { setSelectedManager(e.target.value); setOverviewPage(1); }} className="w-full px-4 py-2 border rounded-lg"><option value="ALL">全部管理者</option>{managerList.map(mgr => <option key={mgr} value={mgr}>{mgr}</option>)}</select></div>
              </div>
              {((selectedDepartment && selectedDepartment !== 'ALL') || (selectedCategory && selectedCategory !== 'ALL') || (selectedWarehouse && selectedWarehouse !== 'ALL') || (selectedManager && selectedManager !== 'ALL') || searchTerm) && <div className="mt-3 flex items-center gap-2 text-sm"><span className="text-gray-600">已篩選：</span>{selectedDepartment && selectedDepartment !== 'ALL' && <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">部門: {selectedDepartment}</span>}{selectedCategory && selectedCategory !== 'ALL' && <span style={{ backgroundColor: 'var(--info-light)', color: 'var(--info)' }} className="px-2 py-1 rounded">{selectedCategory}</span>}{selectedWarehouse && selectedWarehouse !== 'ALL' && <span className="bg-green-100 text-green-800 px-2 py-1 rounded">{warehouses.find(w => w.id === selectedWarehouse)?.name}</span>}{selectedManager && selectedManager !== 'ALL' && <span className="bg-pink-100 text-pink-800 px-2 py-1 rounded">管理者: {selectedManager}</span>}{searchTerm && <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">關鍵字: {searchTerm}</span>}<button onClick={() => { setSelectedDepartment('ALL'); setSelectedCategory('ALL'); setSelectedWarehouse('ALL'); setSelectedManager('ALL'); setSearchTerm(''); setOverviewPage(1); }} className="text-red-600 hover:text-red-800 ml-2">清除全部</button></div>}
            </div>
            {(() => {

              const filteredWarehouses = warehouses.filter(w => w.isActive && (selectedDepartment === 'ALL' || w.department === selectedDepartment));
              const filteredItems = items.filter(item => {
                const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
                // 倉庫篩選：顯示所有在該倉庫有異動記錄的品項(包括零庫存和負庫存)
                const matchWarehouse = selectedWarehouse === 'ALL' || (() => {

                  // 只要有異動記錄就顯示(包括負數、零、正數)
                  const hasMovements = movements.some(m => m.itemId === item.id && m.warehouseId === selectedWarehouse);
                  return hasMovements;
                })();
                const matchSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase());
                // 部門篩選：檢查物品是否在該部門的倉庫有庫存
                const matchDepartment = selectedDepartment === 'ALL' || filteredWarehouses.some(wh => calculateStock(item.id, wh.id) !== 0);
                // 管理者篩選：檢查物品是否由該管理者負責(不論庫存數量)
                const matchManager = selectedManager === 'ALL' || (() => {
                  // 檢查該物品是否在該管理者的負責範圍內
                  return warehouses.some(wh => {
                    // 判斷該倉庫中該物品的負責人
                    // 1. 優先: 倉庫+分類組合
                    const combinedAssignment = managerAssignments.find(
                      a => a.type === 'combined' && a.warehouseId === wh.id && a.category === item.category
                    );
                    if (combinedAssignment && combinedAssignment.manager === selectedManager) return true;

                    // 2. 次優先: 倉庫管理者
                    const warehouseAssignment = managerAssignments.find(
                      a => a.type === 'warehouse' && a.warehouseId === wh.id
                    );
                    if (warehouseAssignment && warehouseAssignment.manager === selectedManager) return true;

                    // 3. 最後: 分類管理者
                    const categoryAssignment = managerAssignments.find(
                      a => a.type === 'category' && a.category === item.category
                    );
                    if (categoryAssignment && categoryAssignment.manager === selectedManager) return true;

                    return false;
                  });
                })();
                return matchCategory && matchWarehouse && matchSearch && matchDepartment && matchManager;
              });

              // 排序：按物品名稱排序（與列印報表一致）
              filteredItems.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));

              const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE); const startIndex = (overviewPage - 1) * ITEMS_PER_PAGE; const endIndex = startIndex + ITEMS_PER_PAGE; const paginatedItems = filteredItems.slice(startIndex, endIndex);

              return filteredItems.length === 0 ? (<div className="bg-white rounded-lg shadow p-8 text-center"><AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" /><p className="text-gray-600">沒有符合篩選條件的物品</p></div>) : (<><div className="bg-white rounded-lg shadow overflow-x-auto"><table className="min-w-full"><thead className="bg-gray-50"><tr><th className="px-4 py-4 text-left text-sm font-medium text-gray-500 uppercase">物品</th><th className="px-4 py-4 text-left text-sm font-medium text-gray-500 uppercase">分類</th><th className="px-4 py-4 text-left text-sm font-medium text-gray-500 uppercase">單位</th><th className="px-4 py-4 text-left text-sm font-medium text-gray-500 uppercase">頻率</th><th className="px-4 py-4 text-left text-sm font-medium text-gray-500 uppercase">管理者</th><th className="px-4 py-4 text-left text-sm font-medium text-gray-500 uppercase">倉庫分佈</th><th className="px-4 py-4 text-center text-sm font-medium text-gray-500 uppercase" style={{ backgroundColor: 'var(--info-light)' }}>總計</th><th className="px-4 py-4 text-center text-sm font-medium text-gray-500 uppercase">操作</th></tr></thead><tbody className="divide-y divide-gray-200">{paginatedItems.map(item => { const distribution = getWarehouseDistribution(item.id); const totalStock = calculateTotalStock(item.id); const managers = getAllManagers(item.id); return (<tr key={item.id} className="hover:bg-gray-50"><td className="px-4 py-4 font-medium text-sm">{item.name}</td><td className="px-4 py-4 text-sm">{item.category}</td><td className="px-4 py-4 text-sm">{item.unit}</td><td className="px-4 py-4 text-sm text-gray-600">{item.frequency}</td><td className="px-4 py-4 text-sm"><div className="flex flex-wrap gap-1">{managers.length === 0 ? <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">-</span> : managers.map(m => <span key={m.manager} className="px-2 py-1 rounded text-xs font-medium bg-info-light text-info cursor-help" title={`負責倉庫: ${m.warehouses.join(', ')}`}>{m.manager}</span>)}</div></td><td className="px-4 py-4"><div className="flex flex-wrap gap-1">{distribution.length === 0 ? <span className="text-gray-400 text-xs">無庫存</span> : distribution.map(({ warehouse, stock }) => <span key={warehouse.id} className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{warehouse.code}({stock})</span>)}</div></td><td className="px-4 py-4 text-center"><span className="inline-flex items-center gap-2"><span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getStockDotColor(totalStock), display: 'inline-block' }}></span><span style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-semibold)', fontSize: '16px' }}>{totalStock}</span></span></td><td className="px-4 py-4 text-center space-x-2"><button onClick={() => { setSelectedItemForMovement({ item, warehousesWithStock: distribution.filter(d => d.stock > 0).map(d => d.warehouse) }); setShowMovementModal(true); }} className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-xs">異動</button><button onClick={() => { setEditingItem(item); setShowItemModal(true); }} className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700 text-xs">編輯</button><button onClick={() => handleDeleteItem(item.id)} className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 text-xs">刪除</button></td></tr>); })}</tbody></table></div>{totalPages > 1 && <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow"><div className="text-sm text-gray-700">顯示 {startIndex + 1} 到 {Math.min(endIndex, filteredItems.length)} 筆，共 {filteredItems.length} 筆</div><div className="flex gap-2"><button onClick={() => setOverviewPage(p => Math.max(1, p - 1))} disabled={overviewPage === 1} className={`px-3 py-1 rounded ${overviewPage === 1 ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>上一頁</button><span className="px-3 py-1">第 {overviewPage} / {totalPages} 頁</span><button onClick={() => setOverviewPage(p => Math.min(totalPages, p + 1))} disabled={overviewPage === totalPages} className={`px-3 py-1 rounded ${overviewPage === totalPages ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>下一頁</button></div></div>}</>);

            })()}
          </div>
        )}


        {activeTab === 'warehouses' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">倉庫管理</h2>
              <button
                onClick={() => {
                  setEditingWarehouse(null);
                  setShowWarehouseModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                新增倉庫
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">倉庫代號</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">倉庫名稱</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">樓層</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">部門</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {warehouses.map(wh => (
                    <tr key={wh.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">{wh.code}</td>
                      <td className="px-6 py-4">{wh.name}</td>
                      <td className="px-6 py-4">{wh.floor}</td>
                      <td className="px-6 py-4">{wh.department}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded ${wh.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {wh.isActive ? '啟用' : '停用'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setEditingWarehouse(wh);
                            setShowWarehouseModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteWarehouse(wh.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'movements' && (
          <div>
            <h2 className="text-xl font-bold mb-4">異動記錄</h2>

            {/* 篩選面板 */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              {/* 搜尋框 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">搜尋物品或備註</label>
                <input
                  type="text"
                  placeholder="輸入物品名稱或備註關鍵字..."
                  value={movementSearchTerm}
                  onChange={(e) => { setMovementSearchTerm(e.target.value); setMovementPage(1); }}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              {/* 篩選下拉選單 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">選擇倉庫</label>
                  <select
                    value={movementWarehouse}
                    onChange={(e) => { setMovementWarehouse(e.target.value); setMovementPage(1); }}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="ALL">全部倉庫</option>
                    {warehouses.filter(w => w.isActive).map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">異動類型</label>
                  <select
                    value={movementType}
                    onChange={(e) => { setMovementType(e.target.value); setMovementPage(1); }}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="ALL">全部類型</option>
                    <option value="入庫">入庫</option>
                    <option value="出庫">出庫</option>
                    <option value="調撥">調撥</option>
                    <option value="調整">調整</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">操作人員</label>
                  <select
                    value={movementOperator}
                    onChange={(e) => { setMovementOperator(e.target.value); setMovementPage(1); }}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="ALL">全部人員</option>
                    {operatorList.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                    <option value="系統">系統</option>
                  </select>
                </div>
              </div>

              {/* 日期範圍 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">起始日期</label>
                  <input
                    type="date"
                    value={movementStartDate}
                    onChange={(e) => { setMovementStartDate(e.target.value); setMovementPage(1); }}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">結束日期</label>
                  <input
                    type="date"
                    value={movementEndDate}
                    onChange={(e) => { setMovementEndDate(e.target.value); setMovementPage(1); }}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* 已篩選標籤 + 清除按鈕 */}
              {(movementSearchTerm || movementWarehouse !== 'ALL' || movementType !== 'ALL' || movementOperator !== 'ALL' || movementStartDate || movementEndDate) && (
                <div className="mt-4 flex items-center gap-2 text-sm flex-wrap">
                  <span className="text-gray-600">已篩選：</span>
                  {movementSearchTerm && (
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">關鍵字: {movementSearchTerm}</span>
                  )}
                  {movementWarehouse !== 'ALL' && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">{warehouses.find(w => w.id === movementWarehouse)?.name}</span>
                  )}
                  {movementType !== 'ALL' && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{movementType}</span>
                  )}
                  {movementOperator !== 'ALL' && (
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">{movementOperator}</span>
                  )}
                  {(movementStartDate || movementEndDate) && (
                    <span className="bg-pink-100 text-pink-800 px-2 py-1 rounded">
                      {movementStartDate || '...'} ~ {movementEndDate || '...'}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setMovementSearchTerm('');
                      setMovementWarehouse('ALL');
                      setMovementType('ALL');
                      setMovementOperator('ALL');
                      setMovementStartDate('');
                      setMovementEndDate('');
                      setMovementPage(1);
                    }}
                    className="text-red-600 hover:text-red-800 ml-2"
                  >
                    清除全部
                  </button>
                </div>
              )}
            </div>

            {/* 篩選邏輯 */}
            {(() => {
              const filteredMovements = movements.filter(mov => {
                // 搜尋:物品名稱或備註
                if (movementSearchTerm) {
                  const searchLower = movementSearchTerm.toLowerCase();
                  const matchName = mov.itemName?.toLowerCase().includes(searchLower);
                  const matchNote = mov.note?.toLowerCase().includes(searchLower);
                  if (!matchName && !matchNote) return false;
                }

                // 篩選:倉庫
                if (movementWarehouse && movementWarehouse !== 'ALL') {
                  if (mov.warehouseId !== movementWarehouse) return false;
                }

                // 篩選:異動類型
                if (movementType && movementType !== 'ALL') {
                  if (mov.type !== movementType) return false;
                }

                // 篩選:操作人員
                if (movementOperator && movementOperator !== 'ALL') {
                  if (mov.operator !== movementOperator) return false;
                }

                // 篩選:日期範圍
                if (movementStartDate) {
                  const movDate = new Date(mov.createdAt);
                  const startDate = new Date(movementStartDate);
                  if (movDate < startDate) return false;
                }
                if (movementEndDate) {
                  const movDate = new Date(mov.createdAt);
                  const endDate = new Date(movementEndDate);
                  endDate.setHours(23, 59, 59, 999);
                  if (movDate > endDate) return false;
                }

                return true;
              }).sort((a, b) => {
                // 按建立時間降序排列,最新的在前
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA;
              });

              // 分頁計算
              const totalPages = Math.ceil(filteredMovements.length / MOVEMENTS_PER_PAGE);
              const startIndex = (movementPage - 1) * MOVEMENTS_PER_PAGE;
              const endIndex = startIndex + MOVEMENTS_PER_PAGE;
              const paginatedMovements = filteredMovements.slice(startIndex, endIndex);

              return (
                <>
                  {/* 顯示篩選結果數量 */}
                  <div className="mb-2 text-sm text-gray-700">
                    顯示 {startIndex + 1} 到 {Math.min(endIndex, filteredMovements.length)} 筆，共 {filteredMovements.length} 筆異動記錄
                    {filteredMovements.length !== movements.length && ` (總計 ${movements.length} 筆)`}
                  </div>

                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">物品</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">倉庫</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">類型</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">數量</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">備註</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作人員</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedMovements.map(mov => (
                          <tr key={mov.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">{mov.date}</td>
                            <td className="px-4 py-3">{mov.itemName}</td>
                            <td className="px-4 py-3">{mov.warehouseName}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded ${mov.type === '入庫' ? 'bg-green-100 text-green-800' :
                                mov.type === '出庫' ? 'bg-red-100 text-red-800' :
                                  mov.type === '調撥' ? 'bg-info-light text-info' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                {mov.type}
                              </span>
                            </td>
                            <td className="px-4 py-3">{mov.quantity > 0 ? '+' : ''}{mov.quantity}</td>
                            <td className="px-4 py-3 max-w-xs truncate">{mov.note}</td>
                            <td className="px-4 py-3">{mov.operator}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 分頁控制 */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow">
                      <div className="text-sm text-gray-700">
                        顯示 {startIndex + 1} 到 {Math.min(endIndex, filteredMovements.length)} 筆，共 {filteredMovements.length} 筆
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setMovementPage(p => Math.max(1, p - 1))}
                          disabled={movementPage === 1}
                          className={`px-3 py-1 rounded ${movementPage === 1 ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                          上一頁
                        </button>
                        <span className="px-3 py-1">第 {movementPage} / {totalPages} 頁</span>
                        <button
                          onClick={() => setMovementPage(p => Math.min(totalPages, p + 1))}
                          disabled={movementPage === totalPages}
                          className={`px-3 py-1 rounded ${movementPage === totalPages ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                          下一頁
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {activeTab === 'managers' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">管理者設定</h2>
              <button
                onClick={() => { setEditingAssignment(null); setShowManagerModal(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                新增分配
              </button>
            </div>

            {managerAssignments.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Users className="w-20 h-20 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 text-lg mb-2">尚未設定管理者分配</p>
                <p className="text-gray-500 text-sm">點擊上方「新增分配」按鈕開始設定</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">管理者</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">分配類型</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">範圍</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {managerAssignments.map(assignment => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="font-medium text-indigo-600">{assignment.manager}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${assignment.type === 'category'
                            ? 'bg-info-light text-info'
                            : assignment.type === 'warehouse'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                            }`}>
                            {assignment.type === 'category'
                              ? '按分類'
                              : assignment.type === 'warehouse'
                                ? '按倉庫'
                                : '倉庫+分類'
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {assignment.type === 'category'
                            ? assignment.category
                            : assignment.type === 'warehouse'
                              ? warehouses.find(w => w.id === assignment.warehouseId)?.name || assignment.warehouseId
                              : `${warehouses.find(w => w.id === assignment.warehouseId)?.name || assignment.warehouseId} - ${assignment.category}`
                          }
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => { setEditingAssignment(assignment); setShowManagerModal(true); }}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            <Edit2 className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteManagerAssignment(assignment.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 組合管理頁面 */}
        {activeTab === 'combos' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">組合管理</h2>
              <button
                onClick={() => {
                  setEditingCombo(null);
                  setShowComboModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                新增組合
              </button>
            </div>

            {/* 組合清單 */}
            <div className="bg-white rounded-lg shadow">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">組合名稱</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">說明</th>
                    <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">物品數量</th>
                    <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">建立時間</th>
                    <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {combos.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        尚無組合，請點擊「新增組合」建立第一個組合
                      </td>
                    </tr>
                  ) : (
                    combos.map(combo => (
                      <tr key={combo.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">{combo.name}</td>
                        <td className="px-6 py-4 text-gray-600">{combo.description || '-'}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {combo.items.length} 項
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-500">
                          {new Date(combo.createdAt).toLocaleDateString('zh-TW')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setEditingCombo(combo);
                              setShowComboModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                            title="編輯組合"
                          >
                            <Edit2 className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteCombo(combo.id)}
                            className="text-red-600 hover:text-red-800"
                            title="刪除組合"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Toast 通知容器 */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#363636',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            duration: 4000,
          },
        }}
      />

      {/* Modals */}
      {showGuideModal && <GuideModal onClose={() => setShowGuideModal(false)} />}
      {showItemModal && <ItemModal item={editingItem} onSave={handleSaveItem} onClose={() => setShowItemModal(false)} unitList={unitList} onAddUnit={handleAddUnit} categoryList={categoryList} onAddCategory={handleAddCategory} />}
      {showWarehouseModal && <WarehouseModal warehouse={editingWarehouse} onSave={handleSaveWarehouse} onClose={() => setShowWarehouseModal(false)} />}
      {showMovementModal && <MovementModal items={items} warehouses={warehouses} onCreate={handleCreateMovement} onTransfer={handleTransfer} onClose={() => { setShowMovementModal(false); setSelectedItemForMovement(null); }} prefilledData={selectedItemForMovement} operatorList={operatorList} onAddOperator={handleAddOperator} />}
      {showBatchMovementModal && <BatchMovementModal items={items} warehouses={warehouses} movements={movements} combos={combos} onSubmit={handleCreateBatchMovement} onClose={() => setShowBatchMovementModal(false)} operatorList={operatorList} onAddOperator={handleAddOperator} />}
      {showComboModal && <ComboModal combo={editingCombo} items={items} onSave={handleSaveCombo} onClose={() => { setShowComboModal(false); setEditingCombo(null); }} />}
      {showPrintModal && <PrintModal config={printConfig} setConfig={setPrintConfig} warehouses={warehouses} categories={categoryList} managerList={managerList} onPrint={() => { handlePrint(printConfig, items, warehouses, categoryList, calculateStock, calculateTotalStock, getItemManager, managerAssignments); setShowPrintModal(false); }} onClose={() => setShowPrintModal(false)} />}
      {showManagerModal && <ManagerAssignmentModal assignment={editingAssignment} categories={categoryList} warehouses={warehouses} managerList={managerList} onSave={handleSaveManagerAssignment} onClose={() => { setShowManagerModal(false); setEditingAssignment(null); }} />}
    </div>
  );
};

// ==================== 列印相關函數和組件 ====================

const handlePrint = (config, items, warehouses, categories, calculateStock, calculateTotalStock, getItemManager, managerAssignments) => {
  if (!config.frequency) {
    toast.error('請選擇盤點頻率');
    return;
  }

  // 篩選物品(按頻率) - 累進式包含規則
  let filteredItems;
  if (config.frequency === '每月') {
    // 每月：只列印頻率為每月的品項
    filteredItems = items.filter(item => item.frequency === '每月');
  } else if (config.frequency === '每季') {
    // 每季：列印頻率為每月+每季品項
    filteredItems = items.filter(item => ['每月', '每季'].includes(item.frequency));
  } else if (config.frequency === '每半年') {
    // 每半年：列印頻率為每月+每季+每半年
    filteredItems = items.filter(item => ['每月', '每季', '每半年'].includes(item.frequency));
  } else if (config.frequency === '每年') {
    // 每年：列印所有頻率的品項
    filteredItems = items.filter(item => ['每月', '每季', '每半年', '每年'].includes(item.frequency));
  } else {
    // 預設保留原始行為
    filteredItems = items.filter(item => item.frequency === config.frequency);
  }

  // 篩選倉庫
  let filteredWarehouses = warehouses.filter(w => w.isActive);
  if (config.rangeType === 'department') {
    filteredWarehouses = filteredWarehouses.filter(w => w.department === config.rangeValue);
  } else if (config.rangeType === 'warehouse') {
    filteredWarehouses = filteredWarehouses.filter(w => w.id === config.rangeValue);
  } else if (config.rangeType === 'manager' && config.rangeValue !== 'ALL_MANAGERS') {
    // 按負責人篩選：只保留該負責人管理的物品（非全部負責人時）
    filteredItems = filteredItems.filter(item => getItemManager(item.id) === config.rangeValue);
  }

  // 只保留在篩選倉庫中有庫存的物品
  filteredItems = filteredItems.filter(item =>
    filteredWarehouses.some(wh => calculateStock(item.id, wh.id) !== 0)
  );

  // 生成列印內容
  const printWindow = window.open('', '_blank');
  const printContent = generatePrintHTML(config, filteredItems, filteredWarehouses, categories, calculateStock, calculateTotalStock, getItemManager, managerAssignments);
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();

  // 延遲執行列印，確保內容完全載入
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

const generatePrintHTML = (config, items, warehouses, categories, calculateStock, calculateTotalStock, getItemManager, managerAssignments) => {
  const today = new Date().toLocaleDateString('zh-TW');
  const rangeText = config.rangeType === 'department' ? `部門：${config.rangeValue}` :
    config.rangeType === 'warehouse' ? `倉庫：${warehouses.find(w => w.id === config.rangeValue)?.name}` :
      config.rangeType === 'manager' && config.rangeValue === 'ALL_MANAGERS' ? '負責人：全部負責人' :
        config.rangeType === 'manager' ? `負責人：${config.rangeValue}` :
          '範圍：全部';

  let contentTables = '';

  // 如果選擇全部負責人，按負責人分組
  if (config.rangeType === 'manager' && config.rangeValue === 'ALL_MANAGERS') {
    // 創建一個輔助函數來獲取特定倉庫中特定物品的負責人
    const getItemManagerInWarehouse = (itemId, warehouseId) => {
      const item = items.find(i => i.id === itemId);
      if (!item) return '-';
      const warehouse = warehouses.find(w => w.id === warehouseId);
      if (!warehouse) return '-';
      const combinedAssignment = managerAssignments.find(a => a.type === 'combined' && a.warehouseId === warehouseId && a.category === item.category);
      if (combinedAssignment) return combinedAssignment.manager;
      const warehouseAssignment = managerAssignments.find(a => a.type === 'warehouse' && a.warehouseId === warehouseId);
      if (warehouseAssignment) return warehouseAssignment.manager;
      const categoryAssignment = managerAssignments.find(a => a.type === 'category' && a.category === item.category);
      if (categoryAssignment) return categoryAssignment.manager;
      return '-';
    };

    // 收集所有 (物品, 倉庫, 負責人) 的組合
    const itemWarehouseManagers = [];
    items.forEach(item => {
      warehouses.forEach(wh => {
        const stock = calculateStock(item.id, wh.id);
        if (stock !== 0) {
          const manager = getItemManagerInWarehouse(item.id, wh.id);
          if (manager && manager !== '-') {
            itemWarehouseManagers.push({ item, warehouse: wh, stock, manager });
          }
        }
      });
    });

    // 按負責人分組
    const managerGroups = {};
    itemWarehouseManagers.forEach(entry => {
      if (!managerGroups[entry.manager]) managerGroups[entry.manager] = [];
      managerGroups[entry.manager].push(entry);
    });
    const managers = Object.keys(managerGroups).sort();

    contentTables = managers.map((manager, index) => {
      const entries = managerGroups[manager];

      if (entries.length === 0) return '';

      // 排序：先按倉庫名稱，再按物品名稱
      entries.sort((a, b) => {
        const warehouseCompare = a.warehouse.name.localeCompare(b.warehouse.name, 'zh-TW');
        if (warehouseCompare !== 0) return warehouseCompare;
        return a.item.name.localeCompare(b.item.name, 'zh-TW');
      });

      const tableRows = entries.map(entry => `
        <tr>
          <td>${entry.item.name}</td>
          <td>${entry.item.category}</td>
          <td class="text-center">${entry.warehouse.name}</td>
          <td class="text-center">${entry.item.unit || '個'}</td>
          <td class="text-center font-bold">${entry.stock}</td>
          <td class="count-col"></td>
          <td class="diff-col"></td>
        </tr>
      `).join('');

      if (!tableRows) return '';

      const pageBreakClass = index === 0 ? '' : 'page-break-before';

      return `
        <div class="warehouse-section ${pageBreakClass}">
          <h2 class="warehouse-title">負責人：${manager}</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 25%;">物品名稱</th>
                <th style="width: 15%;">分類</th>
                <th style="width: 12%;">倉庫</th>
                <th style="width: 8%;">單位</th>
                <th style="width: 12%;">帳面庫存</th>
                <th style="width: 14%;">實際盤點</th>
                <th style="width: 14%;">差異</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="warehouse-footer">
            <div>盤點人員：_______________</div>
            <div>日期：_______________</div>
            <div>簽名：_______________</div>
          </div>
        </div>
      `;
    }).filter(table => table !== '').join('');

  } else {
    // 原本的按倉庫分組邏輯
    contentTables = warehouses.map((warehouse, index) => {
      // 篩選該倉庫有庫存的物品
      const warehouseItems = items.filter(item => {
        const stock = calculateStock(item.id, warehouse.id);
        return stock !== 0; // 包含正值和負值
      });

      if (warehouseItems.length === 0) return ''; // 沒有物品則不顯示此倉庫

      const tableRows = warehouseItems.map(item => {
        const stock = calculateStock(item.id, warehouse.id);
        const manager = getItemManager(item.id);
        return `
          <tr>
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td class="text-center">${manager}</td>
            <td class="text-center">${item.unit || '個'}</td>
            <td class="text-center font-bold">${stock}</td>
            <td class="count-col"></td>
            <td class="diff-col"></td>
          </tr>
        `;
      }).join('');

      // 第一個倉庫不加分頁，其他倉庫在之前分頁
      const pageBreakClass = index === 0 ? '' : 'page-break-before';

      return `
        <div class="warehouse-section ${pageBreakClass}">
          <h2 class="warehouse-title">${warehouse.name} (${warehouse.code})</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 25%;">物品名稱</th>
                <th style="width: 15%;">分類</th>
                <th style="width: 10%;">負責人</th>
                <th style="width: 8%;">單位</th>
                <th style="width: 14%;">帳面庫存</th>
                <th style="width: 14%;">實際盤點</th>
                <th style="width: 14%;">差異</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="warehouse-footer">
            <div>盤點人員：_______________</div>
            <div>日期：_______________</div>
            <div>簽名：_______________</div>
          </div>
        </div>
      `;
    }).filter(table => table !== '').join('');
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>天下客房部庫存盤點表</title>
      <style>
        @media print {
          @page { margin: 1.5cm; }
          body { margin: 0; }
          .page-break-before { page-break-before: always; }
        }
        body {
          font-family: 'Microsoft JhengHei', sans-serif;
          padding: 20px;
          font-size: 12px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .header h1 { margin: 0; font-size: 24px; }
        .header .info { margin-top: 8px; font-size: 14px; color: #666; }
        .warehouse-section {
          margin-bottom: 30px;
        }
        .warehouse-title {
          background-color: #4a5568;
          color: white;
          padding: 10px;
          margin: 20px 0 10px 0;
          font-size: 16px;
          font-weight: bold;
          border-radius: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        th, td {
          border: 1px solid #333;
          padding: 8px 6px;
          text-align: left;
        }
        th {
          background-color: #f0f0f0;
          font-weight: bold;
          text-align: center;
        }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .count-col, .diff-col {
          background-color: #f9f9f9;
          text-align: center;
        }
        .warehouse-footer {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #999;
          display: flex;
          justify-content: space-around;
          font-size: 13px;
        }
        .warehouse-footer div { flex: 1; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>天下客房部庫存盤點表</h1>
        <div class="info">
          日期：${today} &nbsp;|&nbsp; 頻率：${config.frequency} &nbsp;|&nbsp; ${rangeText}
        </div>
      </div>

      ${contentTables}
    </body>
    </html>
  `;
};

const PrintModal = ({ config, setConfig, warehouses, categories, managerList, onPrint, onClose }) => {
  const frequencies = ['每月', '每季', '每半年', '每年'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">列印盤點表</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">盤點頻率 *</label>
            <select
              value={config.frequency}
              onChange={(e) => setConfig({ ...config, frequency: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">請選擇頻率</option>
              {frequencies.map(freq => <option key={freq} value={freq}>{freq}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">列印範圍</label>
            <div className="grid grid-cols-4 gap-2">
              {['all', 'department', 'warehouse', 'manager'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setConfig({ ...config, rangeType: type, rangeValue: '' })}
                  className={`px-3 py-2 rounded text-sm ${config.rangeType === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {type === 'all' ? '全部' : type === 'department' ? '按部門' : type === 'warehouse' ? '按倉庫' : '按負責人'}
                </button>
              ))}
            </div>
          </div>

          {config.rangeType === 'department' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">選擇部門</label>
              <select
                value={config.rangeValue}
                onChange={(e) => setConfig({ ...config, rangeValue: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">請選擇部門</option>
                <option value="櫃檯">櫃檯</option>
                <option value="服中">服中</option>
                <option value="倉庫">倉庫</option>
                <option value="其他">其他</option>
              </select>
            </div>
          )}

          {config.rangeType === 'warehouse' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">選擇倉庫</label>
              <select
                value={config.rangeValue}
                onChange={(e) => setConfig({ ...config, rangeValue: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">請選擇倉庫</option>
                {warehouses.filter(w => w.isActive).map(wh =>
                  <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
                )}
              </select>
            </div>
          )}

          {config.rangeType === 'manager' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">選擇負責人</label>
              <select
                value={config.rangeValue}
                onChange={(e) => setConfig({ ...config, rangeValue: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">請選擇負責人</option>
                <option value="ALL_MANAGERS">全部負責人</option>
                {managerList.map(manager => <option key={manager} value={manager}>{manager}</option>)}
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              onClick={onPrint}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              列印
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ManagerAssignmentModal = ({ assignment, categories, warehouses, managerList, onSave, onClose }) => {
  const [formData, setFormData] = React.useState({
    manager: assignment?.manager || '',
    type: assignment?.type || 'category',
    category: assignment?.category || '',
    warehouseId: assignment?.warehouseId || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.manager) {
      alert('請選擇管理者');
      return;
    }
    if (formData.type === 'category' && !formData.category) {
      alert('請選擇分類');
      return;
    }
    if (formData.type === 'warehouse' && !formData.warehouseId) {
      alert('請選擇倉庫');
      return;
    }
    if (formData.type === 'combined') {
      if (!formData.warehouseId || !formData.category) {
        alert('請選擇倉庫和分類');
        return;
      }
    }
    onSave({ ...formData, id: assignment?.id });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">{assignment ? '編輯管理者分配' : '新增管理者分配'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">選擇管理者 *</label>
            <select
              value={formData.manager}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="">請選擇管理者</option>
              {managerList.map(mgr => <option key={mgr} value={mgr}>{mgr}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分配類型 *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'category', label: '按分類' },
                { value: 'warehouse', label: '按倉庫' },
                { value: 'combined', label: '倉庫+分類' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: option.value, category: '', warehouseId: '' })}
                  className={`px-3 py-2 rounded text-sm ${formData.type === option.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {formData.type === 'category' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">選擇分類 *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">請選擇分類</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          )}

          {formData.type === 'warehouse' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">選擇倉庫 *</label>
              <select
                value={formData.warehouseId}
                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">請選擇倉庫</option>
                {warehouses.filter(w => w.isActive).map(wh => <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>)}
              </select>
            </div>
          )}

          {formData.type === 'combined' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">選擇倉庫 *</label>
                <select
                  value={formData.warehouseId}
                  onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">請選擇倉庫</option>
                  {warehouses.filter(w => w.isActive).map(wh => <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">選擇分類 *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">請選擇分類</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              {assignment ? '更新' : '新增'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};



export default MultiWarehouseInventorySystem;