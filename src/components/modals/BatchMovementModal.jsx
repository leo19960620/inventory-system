import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import EditableComboBox from '../common/EditableComboBox';
import { getTaiwanDateYMD } from '../../utils/dateUtils';

/**
 * 異動單 Modal - 支援批次多物品異動
 */
const BatchMovementModal = ({ items, warehouses, movements, combos, onSubmit, onClose, operatorList, onAddOperator }) => {
    const [movementType, setMovementType] = useState('出庫');
    const [formData, setFormData] = useState({
        date: getTaiwanDateYMD(),
        note: '',
        warehouseId: '',
        toWarehouseId: '',
        operator: ''
    });

    const [selectedItems, setSelectedItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const searchInputRef = useRef(null);
    const dropdownRef = useRef(null);

    // 點擊外部關閉下拉清單
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDropdown]);

    // 根據選擇的倉庫和搜尋關鍵字篩選物品
    const getAvailableItems = () => {
        if (!formData.warehouseId) return [];

        // 找出該倉庫有異動記錄的物品
        const itemsInWarehouse = movements
            .filter(m => m.warehouseId === formData.warehouseId)
            .map(m => m.itemId);
        const uniqueItemIds = [...new Set(itemsInWarehouse)];

        // 篩選物品
        let filteredItems = items.filter(item => uniqueItemIds.includes(item.id));

        // 搜尋關鍵字篩選
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filteredItems = filteredItems.filter(item =>
                item.name.toLowerCase().includes(searchLower)
            );
        }

        // 排除已選擇的物品
        filteredItems = filteredItems.filter(item =>
            !selectedItems.some(si => si.itemId === item.id)
        );

        // 按分類排序
        filteredItems.sort((a, b) => {
            const categoryCompare = a.category.localeCompare(b.category, 'zh-TW');
            if (categoryCompare !== 0) return categoryCompare;
            return a.name.localeCompare(b.name, 'zh-TW');
        });

        return filteredItems;
    };

    // 添加物品到已選清單
    const addItem = (item) => {
        setSelectedItems([...selectedItems, {
            itemId: item.id,
            itemName: item.name,
            category: item.category,
            quantity: 1
        }]);
        setSearchTerm('');
        setShowDropdown(false);
        // 自動 focus 回搜尋框
        setTimeout(() => searchInputRef.current?.focus(), 0);
    };

    // 移除已選物品
    const removeItem = (index) => {
        setSelectedItems(selectedItems.filter((_, i) => i !== index));
    };

    // 更新物品數量
    const updateQuantity = (index, value) => {
        const newItems = [...selectedItems];
        newItems[index].quantity = value;
        setSelectedItems(newItems);
    };

    // 送出異動單
    const handleSubmit = (e) => {
        e.preventDefault();

        // 驗證
        if (!formData.warehouseId) {
            alert('請選擇倉庫');
            return;
        }

        if (movementType === '調撥' && !formData.toWarehouseId) {
            alert('請選擇目標倉庫');
            return;
        }

        if (selectedItems.length === 0) {
            alert('請至少選擇一個物品');
            return;
        }

        // 驗證所有物品的數量
        for (const item of selectedItems) {
            const qty = parseInt(item.quantity, 10);
            if (isNaN(qty) || qty === 0) {
                alert(`請為「${item.itemName}」輸入有效的數量`);
                return;
            }
            if (movementType !== '調整' && qty < 0) {
                alert(`「${item.itemName}」的數量不可為負值`);
                return;
            }
        }

        // 提交資料
        onSubmit({
            ...formData,
            type: movementType,
            items: selectedItems.map(item => ({
                itemId: item.itemId,
                itemName: item.itemName,
                quantity: parseInt(item.quantity, 10)
            }))
        });
    };

    const availableItems = getAvailableItems();

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white rounded-lg max-w-4xl w-full my-8 max-h-[90vh] flex flex-col">
                <h3 className="text-xl font-bold mb-4 px-6 pt-6">新增異動單</h3>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="px-6 pb-4 overflow-y-auto flex-1 space-y-4">
                        {/* 異動日期 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">異動日期 *</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                                required
                            />
                        </div>

                        {/* 異動類型 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">異動類型 *</label>
                            <div className="grid grid-cols-4 gap-2">
                                {['出庫', '入庫', '調撥', '調整'].map(type => {
                                    let buttonStyle = '';
                                    if (type === '出庫') {
                                        buttonStyle = movementType === type
                                            ? 'bg-red-600 text-white'
                                            : 'bg-red-50 text-red-700 hover:bg-red-100';
                                    } else {
                                        buttonStyle = movementType === type
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
                                    }
                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setMovementType(type)}
                                            className={`px-3 py-2 rounded text-sm ${buttonStyle}`}
                                        >
                                            {type}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 倉庫選擇 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {movementType === '調撥' ? '來源倉庫 *' : '倉庫 *'}
                            </label>
                            <select
                                value={formData.warehouseId}
                                onChange={(e) => {
                                    setFormData({ ...formData, warehouseId: e.target.value });
                                    setSelectedItems([]); // 清空已選物品
                                }}
                                className="w-full px-3 py-2 border rounded-lg"
                                required
                            >
                                <option value="">選擇倉庫</option>
                                {warehouses.filter(w => w.isActive).map(wh => (
                                    <option key={wh.id} value={wh.id}>
                                        {wh.name} ({wh.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 目標倉庫（調撥時顯示） */}
                        {movementType === '調撥' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">目標倉庫 *</label>
                                <select
                                    value={formData.toWarehouseId}
                                    onChange={(e) => setFormData({ ...formData, toWarehouseId: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                >
                                    <option value="">選擇目標倉庫</option>
                                    {warehouses.filter(w => w.isActive && w.id !== formData.warehouseId).map(wh => (
                                        <option key={wh.id} value={wh.id}>
                                            {wh.name} ({wh.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* 物品選擇區域 */}
                        {formData.warehouseId && (
                            <div className="border-t pt-4">
                                {/* 快速選擇組合 */}
                                {combos && combos.length > 0 && (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">快速選擇組合</label>
                                        <select
                                            onChange={(e) => {
                                                if (!e.target.value) return;
                                                const combo = combos.find(c => c.id === e.target.value);
                                                if (!combo) return;

                                                // 將組合中的物品加入已選清單
                                                const newItems = combo.items.map(item => ({
                                                    itemId: item.itemId,
                                                    itemName: item.itemName,
                                                    category: items.find(i => i.id === item.itemId)?.category || '',
                                                    quantity: item.quantity
                                                }));

                                                setSelectedItems([...selectedItems, ...newItems]);
                                                e.target.value = '';
                                            }}
                                            className="w-full px-3 py-2 border rounded-lg"
                                        >
                                            <option value="">選擇組合...</option>
                                            {combos.map(combo => (
                                                <option key={combo.id} value={combo.id}>
                                                    {combo.name} ({combo.items.length} 項)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <label className="block text-sm font-medium text-gray-700 mb-2">新增物品</label>
                                {!formData.warehouseId && (
                                    <div className="mb-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm flex items-center gap-2">
                                        <span>💡</span>
                                        請先選擇上方倉庫，才能開始搜尋與新增物品。
                                    </div>
                                )}
                                <div className="relative" ref={dropdownRef}>
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchTerm}
                                        disabled={!formData.warehouseId}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setShowDropdown(true);
                                        }}
                                        onFocus={() => setShowDropdown(true)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                                setShowDropdown(false);
                                                setSearchTerm('');
                                            }
                                        }}
                                        placeholder="搜尋物品名稱..."
                                        className={`w-full px-3 py-2 border rounded-lg ${!formData.warehouseId ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                                    />

                                    {/* 搜尋結果下拉清單 */}
                                    {showDropdown && availableItems.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {availableItems.map(item => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => addItem(item)}
                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                                >
                                                    <div className="font-medium">{item.name}</div>
                                                    <div className="text-xs text-gray-500">{item.category}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* 已選擇的物品清單 */}
                                {selectedItems.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-sm font-medium text-gray-700 mb-2">已選擇物品 ({selectedItems.length})</p>
                                        <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                                            <table className="min-w-full text-sm">
                                                <thead className="bg-gray-50 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">物品</th>
                                                        <th className="px-4 py-2 text-left">分類</th>
                                                        <th className="px-4 py-2 text-center" style={{ width: '140px' }}>數量</th>
                                                        <th className="px-4 py-2 text-center" style={{ width: '80px' }}>操作</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {selectedItems.map((item, index) => (
                                                        <tr key={index} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3">{item.itemName}</td>
                                                            <td className="px-4 py-3 text-gray-600">{item.category}</td>
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="number"
                                                                    value={item.quantity}
                                                                    onChange={(e) => updateQuantity(index, e.target.value)}
                                                                    className="w-full px-3 py-2 border rounded text-center"
                                                                    {...(movementType !== '調整' && { min: "1" })}
                                                                    step="1"
                                                                    onWheel={(e) => e.target.blur()}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeItem(index)}
                                                                    className="text-red-600 hover:text-red-800 p-1"
                                                                    title="移除"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 異動原因 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">異動原因（備註）</label>
                            <textarea
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                                rows="2"
                                placeholder="輸入異動原因或備註..."
                            />
                        </div>

                        {/* 操作人員 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">操作人員</label>
                            <EditableComboBox
                                value={formData.operator}
                                onChange={(value) => setFormData({ ...formData, operator: value })}
                                options={operatorList}
                                onAddNewOption={onAddOperator}
                                placeholder="選擇或輸入操作人員(預設:系統)"
                            />
                        </div>

                    </div>

                    {/* 按鈕區域 - 固定在底部 */}
                    <div className="flex gap-2 px-6 py-4 border-t bg-white">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                            disabled={selectedItems.length === 0}
                        >
                            建立異動單 ({selectedItems.length} 筆)
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                        >
                            取消
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BatchMovementModal;
