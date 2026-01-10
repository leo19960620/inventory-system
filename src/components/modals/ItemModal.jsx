import React, { useState, useEffect } from 'react';
import EditableComboBox from '../common/EditableComboBox';
import toast from 'react-hot-toast';

/**
 * 物品管理 Modal
 * 用於新增和編輯物品資訊
 */
const ItemModal = ({ item, onSave, onClose, unitList, onAddUnit, categoryList, onAddCategory }) => {
    const [formData, setFormData] = useState({
        name: item?.name || '',
        category: item?.category || '',
        frequency: item?.frequency || '每月',
        unit: item?.unit || '個'
    });

    const frequencies = ['每月', '每季', '每半年', '每年'];

    // ESC 快捷鍵支援
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.name || !formData.category) {
            toast.error('請填寫必填欄位');
            return;
        }

        onSave({ ...item, ...formData });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-bold mb-4">{item ? '編輯物品' : '新增物品'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">物品名稱 *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">分類 *</label>
                        <EditableComboBox
                            value={formData.category}
                            onChange={(value) => setFormData({ ...formData, category: value })}
                            options={categoryList}
                            onAddNewOption={onAddCategory}
                            placeholder="選擇或輸入分類"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">單位</label>
                        <EditableComboBox
                            value={formData.unit}
                            onChange={(value) => setFormData({ ...formData, unit: value })}
                            options={unitList}
                            onAddNewOption={onAddUnit}
                            placeholder="選擇或輸入單位"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">盤點頻率</label>
                        <select
                            value={formData.frequency}
                            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                        >
                            {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                            儲存
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

export default ItemModal;
