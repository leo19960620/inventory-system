import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * 組合管理 Modal
 * 用於新增和編輯物品組合
 */
const ComboModal = ({ combo, items, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: combo?.name || '',
        description: combo?.description || ''
    });

    const [selectedItems, setSelectedItems] = useState(combo?.items || []);
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

    // 篩選可用物品
    const getAvailableItems = () => {
        let filteredItems = items;

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

    // 添加物品到組合
    const addItem = (item) => {
        setSelectedItems([...selectedItems, {
            itemId: item.id,
            itemName: item.name,
            category: item.category,
            quantity: 1
        }]);
        setSearchTerm('');
        setShowDropdown(false);
        setTimeout(() => searchInputRef.current?.focus(), 0);
    };

    // 移除組合中的物品
    const removeItem = (index) => {
        setSelectedItems(selectedItems.filter((_, i) => i !== index));
    };

    // 更新物品預設數量
    const updateQuantity = (index, value) => {
        const newItems = [...selectedItems];
        newItems[index].quantity = value;
        setSelectedItems(newItems);
    };

    // 送出組合
    const handleSubmit = (e) => {
        e.preventDefault();

        // 驗證
        if (!formData.name.trim()) {
            alert('請輸入組合名稱');
            return;
        }

        if (selectedItems.length === 0) {
            alert('請至少選擇一個物品');
            return;
        }

        // 驗證所有物品的數量
        for (const item of selectedItems) {
            const qty = parseInt(item.quantity, 10);
            if (isNaN(qty) || qty <= 0) {
                alert(`請為「${item.itemName}」輸入有效的數量`);
                return;
            }
        }

        // 提交資料
        onSave({
            ...formData,
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
                <h3 className="text-xl font-bold mb-4 px-6 pt-6">{combo ? '編輯組合' : '新增組合'}</h3>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="px-6 pb-4 overflow-y-auto flex-1 space-y-4">
                        {/* 組合名稱 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">組合名稱 *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="例如：客房標準配備"
                                required
                            />
                        </div>

                        {/* 說明 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">說明</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg"
                                rows="2"
                                placeholder="輸入組合說明..."
                            />
                        </div>

                        {/* 物品選擇區域 */}
                        <div className="border-t pt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">組合物品</label>
                            <div className="relative" ref={dropdownRef}>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchTerm}
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
                                    className="w-full px-3 py-2 border rounded-lg"
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
                                                    <th className="px-4 py-2 text-center" style={{ width: '140px' }}>預設數量</th>
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
                                                                min="1"
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

                    </div>

                    {/* 按鈕區域 - 固定在底部 */}
                    <div className="flex gap-2 px-6 py-4 border-t bg-white">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                            disabled={selectedItems.length === 0}
                        >
                            儲存組合
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

export default ComboModal;
