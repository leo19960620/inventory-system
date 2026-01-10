import React, { useState } from 'react';
import EditableComboBox from '../common/EditableComboBox';

/**
 * 庫存異動 Modal
 * 處理入庫、出庫、調撥、調整等庫存異動操作
 */
const MovementModal = ({ items, warehouses, onCreate, onTransfer, onClose, prefilledData, operatorList, onAddOperator }) => {
    const [movementType, setMovementType] = useState('出庫');
    const [formData, setFormData] = useState({
        itemId: prefilledData?.item?.id || '',
        warehouseId: prefilledData?.warehouse?.id || '',
        quantity: '',
        note: '',
        operator: '',
        toWarehouseId: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.itemId || !formData.warehouseId || !formData.quantity) {
            alert('請填寫必填欄位');
            return;
        }

        const baseData = {
            ...formData,
            quantity: parseInt(formData.quantity, 10),
            type: movementType
        };

        if (movementType === '調撥') {
            if (!formData.toWarehouseId) {
                alert('請選擇目標倉庫');
                return;
            }
            onTransfer({
                ...baseData,
                fromWarehouseId: formData.warehouseId,
                toWarehouseId: formData.toWarehouseId
            });
        } else {
            if (movementType === '出庫') {
                baseData.quantity = -Math.abs(baseData.quantity);
            }
            onCreate(baseData);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-md w-full my-8">
                <h3 className="text-xl font-bold mb-4">新增庫存異動</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">異動類型 *</label>
                        <div className="grid grid-cols-4 gap-2">
                            {['出庫', '入庫', '調撥', '調整'].map(type => {
                                // 僅為出庫設定紅色樣式,其他保持原有的藍色/灰色樣式
                                let buttonStyle = '';
                                if (type === '出庫') {
                                    buttonStyle = movementType === type
                                        ? 'bg-red-600 text-white'
                                        : 'bg-red-50 text-red-700 hover:bg-red-100';
                                } else {
                                    // 入庫、調撥和調整都使用原有的藍色/灰色樣式
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

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">物品 *</label>
                        <select
                            value={formData.itemId}
                            onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                            required
                        >
                            <option value="">選擇物品</option>
                            {items.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name} ({item.category})
                                </option>
                            ))}
                        </select>
                        {prefilledData?.warehousesWithStock && prefilledData.warehousesWithStock.length > 0 && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                <p className="text-xs text-blue-800">
                                    <strong>有庫存的倉庫:</strong>
                                    {prefilledData.warehousesWithStock.map(wh => `${wh.name}(${wh.code})`).join('、')}
                                </p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {movementType === '調撥' ? '來源倉庫 *' : '倉庫 *'}
                        </label>
                        <select
                            value={formData.warehouseId}
                            onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
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

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            數量 *
                            {movementType === '調整' && (
                                <span className="text-xs text-gray-500 ml-2">(可輸入負值)</span>
                            )}
                        </label>
                        <input
                            type="number"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                            {...(movementType !== '調整' && { min: "1" })}
                            step="1"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                        <textarea
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                            rows="2"
                        />
                    </div>

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

                    <div className="flex gap-2 pt-4">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                            確認{movementType}
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

export default MovementModal;
