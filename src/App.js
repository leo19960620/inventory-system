import React, { useState, useEffect } from 'react';
import { Plus, Minus, Download, FileText, BarChart3, History, Search, Filter, Upload, User, X, Wifi, WifiOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { database } from './firebase';
import { ref, set, onValue } from 'firebase/database';

const InventorySystem = () => {
  const [managerList, setManagerList] = useState(['Nick', 'Wendy', '夜班', 'Irene', 'Cammy']);
  const [assignments, setAssignments] = useState({});
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('inventory');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printManager, setPrintManager] = useState('全部');
  const [printFrequency, setPrintFrequency] = useState('年盤');
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('全部');
  const [filterCategory, setFilterCategory] = useState('全部');
  const [filterManager, setFilterManager] = useState('全部');
  const [newManagerName, setNewManagerName] = useState('');

  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    warehouse: '',
    quantity: 0,
    frequency: '每月',
    manager: ''
  });

  const [adjustment, setAdjustment] = useState({
    type: 'add',
    quantity: 0,
    reason: '',
    operator: ''
  });

  const warehouses = items.length > 0 ? [...new Set(items.map(item => item.warehouse))] : ['Front Desk', 'Front Desk B1'];
  const categories = items.length > 0 ? [...new Set(items.map(item => item.category))] : ['主題商品', '客房備品', '櫃台耗材', '文具', '包裝材料', '其他'];
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const categoryColors = {
    '主題商品': { bg: 'bg-pink-100', text: 'text-pink-800' },
    '客房備品': { bg: 'bg-blue-100', text: 'text-blue-800' },
    '客房用品': { bg: 'bg-cyan-100', text: 'text-cyan-800' },
    '櫃台耗材': { bg: 'bg-purple-100', text: 'text-purple-800' },
    '櫃台贈品': { bg: 'bg-rose-100', text: 'text-rose-800' },
    '文具': { bg: 'bg-green-100', text: 'text-green-800' },
    '包裝材料': { bg: 'bg-orange-100', text: 'text-orange-800' },
    '禮品櫃': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    '醫藥箱': { bg: 'bg-red-100', text: 'text-red-800' },
    '安全與設施': { bg: 'bg-gray-100', text: 'text-gray-800' },
    '其他': { bg: 'bg-slate-100', text: 'text-slate-800' }
  };

  const getCategoryColor = (category) => {
    return categoryColors[category] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const itemsRef = ref(database, 'items');
    const unsubscribe = onValue(itemsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setItems(Object.values(data));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const managersRef = ref(database, 'managerList');
    const unsubscribe = onValue(managersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setManagerList(data);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const assignmentsRef = ref(database, 'assignments');
    const unsubscribe = onValue(assignmentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAssignments(data);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const historyRef = ref(database, 'history');
    const unsubscribe = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setHistory(Object.values(data).sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    });
    return () => unsubscribe();
  }, []);

  const saveToFirebase = (path, data) => {
    if (!isOnline) {
      alert('⚠️ 目前離線，無法儲存資料');
      return;
    }
    set(ref(database, path), data);
  };

  const getManagerByWarehouseAndCategory = (warehouse, category) => {
    const key = `${warehouse}|${category}`;
    return assignments[key] || '未分配';
  };

  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      
      const importedItems = {};
      const newAssignments = {};
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',');
          const category = values[0]?.trim() || '';
          const manager = values[1]?.trim() || '';
          const warehouse = values[4]?.trim() || '';
          
          const itemId = `item_${Date.now()}_${i}`;
          const item = {
            id: itemId,
            category: category,
            manager: manager,
            name: values[2]?.trim() || '',
            frequency: values[3]?.trim() === '月' ? '每月' : values[3]?.trim() === '季' ? '每季' : '每月',
            warehouse: warehouse,
            quantity: parseInt(values[5]) || 0
          };
          
          if (item.name) {
            importedItems[itemId] = item;
            const key = `${warehouse}|${category}`;
            if (manager && !newAssignments[key]) {
              newAssignments[key] = manager;
            }
          }
        }
      }
      
      saveToFirebase('items', importedItems);
      saveToFirebase('assignments', newAssignments);
      setShowImportModal(false);
      alert(`成功匯入 ${Object.keys(importedItems).length} 筆資料！`);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleAddItem = () => {
    const autoManager = getManagerByWarehouseAndCategory(newItem.warehouse, newItem.category);
    const itemId = `item_${Date.now()}`;
    const item = {
      id: itemId,
      ...newItem,
      quantity: parseInt(newItem.quantity),
      manager: autoManager
    };
    
    const newItems = {};
    items.forEach(i => { newItems[i.id] = i; });
    newItems[itemId] = item;
    
    saveToFirebase('items', newItems);
    setShowAddModal(false);
    setNewItem({ name: '', category: '', warehouse: '', quantity: 0, frequency: '每月', manager: '' });
  };

  const handleAddManager = () => {
    if (newManagerName.trim() && !managerList.includes(newManagerName.trim())) {
      const updatedList = [...managerList, newManagerName.trim()];
      saveToFirebase('managerList', updatedList);
      setNewManagerName('');
    }
  };

  const handleDeleteManager = (managerName) => {
    if (window.confirm(`確定要刪除負責人「${managerName}」嗎？相關物品將變為「未分配」。`)) {
      const updatedList = managerList.filter(m => m !== managerName);
      saveToFirebase('managerList', updatedList);
      
      const newAssignments = {};
      Object.keys(assignments).forEach(key => {
        if (assignments[key] !== managerName) {
          newAssignments[key] = assignments[key];
        }
      });
      saveToFirebase('assignments', newAssignments);
    }
  };

  const handleAssignmentChange = (key, manager) => {
    const updatedAssignments = {
      ...assignments,
      [key]: manager
    };
    saveToFirebase('assignments', updatedAssignments);
  };

  const handleAdjustment = () => {
    const qty = parseInt(adjustment.quantity);
    const newItems = {};
    
    items.forEach(item => {
      if (item.id === selectedItem.id) {
        newItems[item.id] = {
          ...item,
          quantity: adjustment.type === 'add' ? item.quantity + qty : item.quantity - qty
        };
      } else {
        newItems[item.id] = item;
      }
    });
    
    const historyId = `history_${Date.now()}`;
    const record = {
      id: historyId,
      itemName: selectedItem.name,
      action: adjustment.type === 'add' ? '增加' : '減少',
      quantity: qty,
      reason: adjustment.reason,
      date: new Date().toISOString().split('T')[0],
      operator: adjustment.operator
    };

    saveToFirebase('items', newItems);
    
    const newHistory = {};
    history.forEach(h => { newHistory[h.id] = h; });
    newHistory[historyId] = record;
    saveToFirebase('history', newHistory);
    
    setShowAdjustModal(false);
    setAdjustment({ type: 'add', quantity: 0, reason: '', operator: '' });
  };

  const handleClearAllData = () => {
    if (window.confirm('⚠️ 確定要清除所有資料嗎？此操作無法復原！')) {
      if (window.confirm('⚠️ 再次確認：這將刪除所有庫存、負責人和操作紀錄！')) {
        saveToFirebase('items', {});
        saveToFirebase('history', {});
        saveToFirebase('assignments', {});
        saveToFirebase('managerList', ['Nick', 'Wendy', '夜班', 'Irene', 'Cammy']);
        alert('✅ 所有資料已清除');
      }
    }
  };

  const exportToCSV = () => {
    const headers = ['類別', '負責人', '物品名稱', '盤點頻率', '倉庫別', '數量'];
    const csvContent = [
      headers.join(','),
      ...items.map(item => [
        item.category,
        item.manager,
        item.name,
        item.frequency === '每月' ? '月' : item.frequency === '每季' ? '季' : item.frequency,
        item.warehouse,
        item.quantity
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `庫存表_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const generatePrintSheet = (selectedManager = '全部', frequencyType = '年盤') => {
    let itemsToPrint = selectedManager === '全部' ? items : items.filter(item => item.manager === selectedManager);
    
    if (frequencyType === '月盤') {
      itemsToPrint = itemsToPrint.filter(item => item.frequency === '每月');
    } else if (frequencyType === '季盤') {
      itemsToPrint = itemsToPrint.filter(item => item.frequency === '每月' || item.frequency === '每季');
    }
    
    const warehousesToPrint = [...new Set(itemsToPrint.map(i => i.warehouse))];
    
    const printContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>庫存盤點表 - ${frequencyType}</title><style>body{font-family:Arial,sans-serif;padding:20px}h1{text-align:center;color:#333}h2{color:#2563eb;margin-top:30px;border-bottom:2px solid #2563eb;padding-bottom:5px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:12px;text-align:left}th{background-color:#3b82f6;color:white}tr:nth-child(even){background-color:#f9fafb}.signature{margin-top:40px}.header-info{background:#f0f9ff;padding:15px;border-radius:8px;margin-bottom:20px}@media print{body{padding:10px}h2{page-break-before:always}}</style></head><body><h1>庫存盤點表 - ${frequencyType}</h1><div class="header-info"><p><strong>盤點日期：</strong>${new Date().toLocaleDateString('zh-TW')}</p>${selectedManager !== '全部' ? `<p><strong>負責人：</strong>${selectedManager}</p>` : ''}<p><strong>盤點類型：</strong>${frequencyType}</p><p><strong>總品項數：</strong>${itemsToPrint.length} 項</p></div>${warehousesToPrint.map(wh => {
      const warehouseItems = itemsToPrint.filter(i => i.warehouse === wh);
      return `<h2>${wh}（${warehouseItems.length} 項）</h2><table><tr><th>品名</th><th>分類</th><th>負責人</th><th>盤點頻率</th><th>帳面數量</th><th>實盤數量</th><th>差異</th></tr>${warehouseItems.map(item => `<tr><td>${item.name}</td><td>${item.category}</td><td>${item.manager}</td><td>${item.frequency}</td><td>${item.quantity}</td><td></td><td></td></tr>`).join('')}</table><div class="signature"><p>盤點人簽名: _______________ 日期: _______________</p></div>`;
    }).join('')}</body></html>`;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
    setShowPrintModal(false);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWarehouse = filterWarehouse === '全部' || item.warehouse === filterWarehouse;
    const matchesCategory = filterCategory === '全部' || item.category === filterCategory;
    const matchesManager = filterManager === '全部' || item.manager === filterManager;
    return matchesSearch && matchesWarehouse && matchesCategory && matchesManager;
  });

  const getWarehouseCategoryCombinations = () => {
    const combinations = new Map();
    items.forEach(item => {
      const key = `${item.warehouse}|${item.category}`;
      if (!combinations.has(key)) {
        const itemCount = items.filter(i => i.warehouse === item.warehouse && i.category === item.category).length;
        combinations.set(key, {
          warehouse: item.warehouse,
          category: item.category,
          key: key,
          itemCount: itemCount
        });
      }
    });
    return Array.from(combinations.values());
  };

  const getManagerStats = () => {
    const stats = {};
    managerList.forEach(manager => {
      stats[manager] = items.filter(item => item.manager === manager).length;
    });
    return stats;
  };

  const warehouseStats = warehouses.map(wh => ({
    name: wh,
    totalQty: items.filter(i => i.warehouse === wh).reduce((sum, i) => sum + i.quantity, 0),
    itemCount: items.filter(i => i.warehouse === wh).length
  }));

  const categoryStats = categories.map(cat => ({
    name: cat,
    totalQty: items.filter(i => i.category === cat).reduce((sum, i) => sum + i.quantity, 0),
    itemCount: items.filter(i => i.category === cat).length
  }));

  const topItems = [...items].sort((a, b) => b.quantity - a.quantity).slice(0, 10);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-6 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">庫存盤點管理系統</h1>
            <p className="text-blue-100 mt-2">雲端協作版 (Firebase)</p>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <div className="flex items-center gap-2 bg-green-500 px-4 py-2 rounded-lg">
                <Wifi className="w-5 h-5" />
                <span className="text-sm font-medium">已連線</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-red-500 px-4 py-2 rounded-lg">
                <WifiOff className="w-5 h-5" />
                <span className="text-sm font-medium">離線</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'inventory', name: '庫存管理', icon: <FileText className="w-5 h-5" /> },
              { id: 'managers', name: '負責人管理', icon: <User className="w-5 h-5" /> },
              { id: 'stats', name: '統計報表', icon: <BarChart3 className="w-5 h-5" /> },
              { id: 'history', name: '操作紀錄', icon: <History className="w-5 h-5" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                <span className="font-medium">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:flex-initial">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="text" placeholder="搜尋物品..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="flex gap-2 items-center">
                    <Filter className="text-gray-400 w-5 h-5" />
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-4 py-2 border rounded-lg">
                      <option>全部</option>
                      {categories.map(cat => <option key={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)} className="px-4 py-2 border rounded-lg">
                    <option>全部</option>
                    {warehouses.map(wh => <option key={wh}>{wh}</option>)}
                  </select>
                  <select value={filterManager} onChange={(e) => setFilterManager(e.target.value)} className="px-4 py-2 border rounded-lg">
                    <option>全部</option>
                    {managerList.map(manager => <option key={manager}>{manager}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto flex-wrap">
                <button onClick={() => setShowImportModal(true)} className="flex-1 md:flex-initial bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2">
                  <Upload className="w-5 h-5" /><span>匯入</span>
                </button>
                <button onClick={exportToCSV} className="flex-1 md:flex-initial bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2">
                  <Download className="w-5 h-5" /><span>匯出</span>
                </button>
                <button onClick={() => setShowAddModal(true)} className="flex-1 md:flex-initial bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2">
                  <Plus className="w-5 h-5" /><span>新增</span>
                </button>
                <button onClick={() => setShowPrintModal(true)} className="flex-1 md:flex-initial bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center justify-center space-x-2">
                  <FileText className="w-5 h-5" /><span>列印</span>
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">尚未匯入資料</h3>
                <p className="text-gray-500 mb-2">請點選「匯入」按鈕上傳您的庫存表</p>
                <p className="text-sm text-green-600 mb-6">✓ 資料會即時同步到雲端，團隊成員即時看到</p>
                <button onClick={() => setShowImportModal(true)} className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 inline-flex items-center space-x-2">
                  <Upload className="w-5 h-5" /><span>匯入 CSV 檔案</span>
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">品名</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分類</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">倉庫</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">數量</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">盤點頻率</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">負責人</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredItems.map(item => {
                        const color = getCategoryColor(item.category);
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap font-medium">{item.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${color.bg} ${color.text}`}>{item.category}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{item.warehouse}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`font-semibold ${item.quantity === 0 ? 'text-red-600' : item.quantity < 10 ? 'text-orange-600' : 'text-green-600'}`}>{item.quantity}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.frequency}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.manager}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-2">
                                <button onClick={() => { setSelectedItem(item); setAdjustment({ ...adjustment, type: 'add' }); setShowAdjustModal(true); }} className="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 flex items-center gap-1 text-sm">
                                  <Plus className="w-4 h-4" />增加
                                </button>
                                <button onClick={() => { setSelectedItem(item); setAdjustment({ ...adjustment, type: 'subtract' }); setShowAdjustModal(true); }} className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 flex items-center gap-1 text-sm">
                                  <Minus className="w-4 h-4" />減少
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="bg-gray-50 px-6 py-4 border-t">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">顯示 {filteredItems.length} 筆資料（總共 {items.length} 筆）</p>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Wifi className="w-4 h-4" />雲端即時同步
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'managers' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">負責人清單</h2>
              <div className="flex gap-2 mb-4">
                <input type="text" placeholder="新增負責人姓名" value={newManagerName} onChange={(e) => setNewManagerName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddManager()} className="flex-1 px-4 py-2 border rounded-lg" />
                <button onClick={handleAddManager} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                  <Plus className="w-5 h-5" /><span>新增</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {managerList.map(manager => {
                  const stats = getManagerStats();
                  return (
                    <div key={manager} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-900">{manager}</span>
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">{stats[manager] || 0} 項</span>
                      <button onClick={() => handleDeleteManager(manager)} className="text-red-600 hover:text-red-800">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold">倉庫與分類負責人分配</h2>
                <p className="text-sm text-gray-600 mt-1">為每個倉庫與分類組合指派負責人</p>
              </div>
              {items.length === 0 ? (
                <div className="p-12 text-center text-gray-500"><p>請先匯入庫存資料</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">倉庫</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分類</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">品項數</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">負責人</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getWarehouseCategoryCombinations().map(combo => {
                        const color = getCategoryColor(combo.category);
                        return (
                          <tr key={combo.key} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{combo.warehouse}</span></td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs rounded-full ${color.bg} ${color.text}`}>{combo.category}</span></td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className="font-semibold text-gray-700">{combo.itemCount} 項</span></td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select value={assignments[combo.key] || '未分配'} onChange={(e) => handleAssignmentChange(combo.key, e.target.value)} className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="未分配">未分配</option>
                                {managerList.map(manager => <option key={manager} value={manager}>{manager}</option>)}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 使用說明</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 所有變更會即時同步到雲端，團隊成員立即看到</li>
                <li>• 可查看每位負責人目前負責的品項數量</li>
                <li>• 修改負責人分配後，相關物品會自動更新</li>
              </ul>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">⚠️ 資料管理</h3>
              <p className="text-sm text-red-800 mb-3">清除所有資料將刪除庫存、負責人分配和操作紀錄</p>
              <button onClick={handleClearAllData} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium">清除所有資料</button>
            </div>
          </div>
        )}

        {activeTab === 'stats' && items.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">總庫存數量</h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">{items.reduce((sum, item) => sum + item.quantity, 0)}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">品項總數</h3>
                <p className="text-3xl font-bold text-green-600 mt-2">{items.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">缺貨品項</h3>
                <p className="text-3xl font-bold text-red-600 mt-2">{items.filter(i => i.quantity === 0).length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">分類數量</h3>
                <p className="text-3xl font-bold text-orange-600 mt-2">{categories.length}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">各倉庫庫存統計</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={warehouseStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalQty" name="總數量" fill="#3b82f6" />
                    <Bar dataKey="itemCount" name="品項數" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">各分類庫存統計</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryStats.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalQty" name="總數量" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">倉庫庫存分布</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={warehouseStats} dataKey="totalQty" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {warehouseStats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">分類庫存分布</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={categoryStats.slice(0, 8)} dataKey="totalQty" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {categoryStats.slice(0, 8).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">庫存量前十名</h3>
              <div className="space-y-3">
                {topItems.map((item, index) => {
                  const color = getCategoryColor(item.category);
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-gray-300">#{index + 1}</span>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <div className="flex gap-2 items-center mt-1">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${color.bg} ${color.text}`}>{item.category}</span>
                            <span className="text-xs text-gray-500">{item.warehouse}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-blue-600">{item.quantity}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6"><h3 className="text-lg font-semibold mb-4">庫存異動紀錄</h3></div>
            {history.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <History className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>尚無異動紀錄</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">品名</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">數量</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">原因</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作人</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map(record => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{record.itemName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${record.action === '增加' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{record.action}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold">{record.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{record.reason}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{record.operator}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-screen overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">列印盤點表</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">1. 選擇盤點類型</label>
                <div className="space-y-2">
                  {[
                    { value: '月盤', label: '月盤', desc: '僅列印盤點頻率為「每月」的物品' },
                    { value: '季盤', label: '季盤', desc: '列印盤點頻率為「每月」及「每季」的物品' },
                    { value: '年盤', label: '年盤', desc: '列印所有物品' }
                  ].map(type => {
                    let count = items;
                    if (type.value === '月盤') count = items.filter(i => i.frequency === '每月');
                    else if (type.value === '季盤') count = items.filter(i => i.frequency === '每月' || i.frequency === '每季');
                    if (printManager !== '全部') count = count.filter(i => i.manager === printManager);
                    return (
                      <button key={type.value} onClick={() => setPrintFrequency(type.value)} className={`w-full text-left p-3 rounded-lg border-2 transition-all ${printFrequency === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{type.label}</p>
                            <p className="text-xs text-gray-500 mt-1">{type.desc}</p>
                          </div>
                          <span className="text-sm bg-gray-200 px-3 py-1 rounded-full font-semibold">{count.length} 項</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">2. 選擇負責人</label>
                <div className="space-y-2">
                  <button onClick={() => setPrintManager('全部')} className={`w-full text-left p-3 rounded-lg border-2 transition-all ${printManager === '全部' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">全部負責人</span>
                      <span className="text-sm bg-gray-200 px-3 py-1 rounded-full font-semibold">
                        {(() => {
                          let count = items;
                          if (printFrequency === '月盤') count = items.filter(i => i.frequency === '每月');
                          else if (printFrequency === '季盤') count = items.filter(i => i.frequency === '每月' || i.frequency === '每季');
                          return count.length;
                        })()} 項
                      </span>
                    </div>
                  </button>
                  {managerList.map(manager => {
                    let count = items.filter(i => i.manager === manager);
                    if (printFrequency === '月盤') count = count.filter(i => i.frequency === '每月');
                    else if (printFrequency === '季盤') count = count.filter(i => i.frequency === '每月' || i.frequency === '每季');
                    return (
                      <button key={manager} onClick={() => setPrintManager(manager)} className={`w-full text-left p-3 rounded-lg border-2 transition-all ${printManager === manager ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{manager}</span>
                          <span className="text-sm bg-gray-200 px-3 py-1 rounded-full font-semibold">{count.length} 項</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => generatePrintSheet(printManager, printFrequency)} className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-medium">確認列印</button>
              <button onClick={() => { setShowPrintModal(false); setPrintManager('全部'); setPrintFrequency('年盤'); }} className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 font-medium">取消</button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">匯入 CSV 檔案</h3>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-4">選擇 CSV 檔案上傳</p>
                <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" id="csv-upload" />
                <label htmlFor="csv-upload" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer inline-block">選擇檔案</label>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800"><strong>CSV 格式要求：</strong><br />欄位順序：類別, 負責人, 物品名稱, 盤點頻率, 倉庫別, 數量</p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowImportModal(false)} className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">取消</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-screen overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">新增物品</h3>
            <div className="space-y-4">
              <input type="text" placeholder="品名" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              <select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                <option value="">選擇分類</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <select value={newItem.warehouse} onChange={(e) => setNewItem({ ...newItem, warehouse: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                <option value="">選擇倉庫</option>
                {warehouses.map(wh => <option key={wh} value={wh}>{wh}</option>)}
              </select>
              {newItem.warehouse && newItem.category && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800"><span className="font-semibold">自動指派負責人：</span>{getManagerByWarehouseAndCategory(newItem.warehouse, newItem.category)}</p>
                </div>
              )}
              <input type="number" placeholder="數量" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              <select value={newItem.frequency} onChange={(e) => setNewItem({ ...newItem, frequency: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                <option>每月</option>
                <option>每季</option>
                <option>每半年</option>
                <option>每年</option>
              </select>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleAddItem} disabled={!newItem.name || !newItem.warehouse || !newItem.category} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed">確認新增</button>
              <button onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">取消</button>
            </div>
          </div>
        </div>
      )}

      {showAdjustModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">{adjustment.type === 'add' ? '增加' : '減少'}庫存 - {selectedItem.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目前數量</label>
                <div className="text-2xl font-bold text-blue-600">{selectedItem.quantity}</div>
              </div>
              <input type="number" placeholder="異動數量" value={adjustment.quantity} onChange={(e) => setAdjustment({ ...adjustment, quantity: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              <input type="text" placeholder="異動原因（必填）" value={adjustment.reason} onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              <input type="text" placeholder="操作人員" value={adjustment.operator} onChange={(e) => setAdjustment({ ...adjustment, operator: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleAdjustment} disabled={!adjustment.reason || !adjustment.quantity} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed">確認調整</button>
              <button onClick={() => setShowAdjustModal(false)} className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventorySystem;