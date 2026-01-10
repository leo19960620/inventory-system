import React, { useEffect } from 'react';

/**
 * 使用說明 Modal
 * 顯示庫存系統的使用指南和操作說明
 */
const GuideModal = ({ onClose }) => {
    // ESC 快捷鍵支援
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">📚 使用說明</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6">
                    {/* 庫存異動操作說明 */}
                    <div className="border-b pb-4">
                        <h3 className="text-xl font-bold text-blue-600 mb-4">📦 庫存異動操作</h3>

                        {/* 入庫 */}
                        <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 rounded">
                            <h4 className="font-bold text-green-800 mb-2">🟢 入庫</h4>
                            <p className="text-sm text-gray-700 mb-2"><strong>使用時機:</strong></p>
                            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                                <li>新購物品到貨時</li>
                                <li>從供應商接收貨物時</li>
                                <li>退貨入庫時</li>
                                <li>盤點發現實物多於系統記錄時(但建議使用「調整」)</li>
                            </ul>
                        </div>

                        {/* 出庫 */}
                        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                            <h4 className="font-bold text-red-800 mb-2">🔴 出庫</h4>
                            <p className="text-sm text-gray-700 mb-2"><strong>使用時機:</strong></p>
                            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                                <li>物品領用/使用時</li>
                                <li>客房補貨時</li>
                                <li>損耗品消耗時</li>
                                <li>物品報廉(破損、過期)時</li>
                                <li>盤點發現實物少於系統記錄時(但建議使用「調整」)</li>
                            </ul>
                        </div>

                        {/* 調撥 */}
                        <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                            <h4 className="font-bold text-blue-800 mb-2">🔄 調撥</h4>
                            <p className="text-sm text-gray-700 mb-2"><strong>使用時機:</strong></p>
                            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                                <li>在倉庫間移動物品時</li>
                                <li>從主倉庫調配到分庫時</li>
                                <li>從櫃檯備貨到服中時</li>
                                <li>倉庫重置或整理時</li>
                            </ul>
                            <p className="text-xs text-blue-700 mt-2">💡 <strong>提示:</strong> 調撥會同時從來源倉庫減少並在目標倉庫增加,總庫存不變。</p>
                        </div>

                        {/* 調整 */}
                        <div className="mb-4 bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                            <h4 className="font-bold text-orange-800 mb-2">⚙️ 調整</h4>
                            <p className="text-sm text-gray-700 mb-2"><strong>使用時機:</strong></p>
                            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                                <li>盤點時發現帳物不符<strong>(最常用)</strong></li>
                                <li>修正之前入庫/出庫的錯誤數量時</li>
                                <li>系統初始化設定初始庫存時</li>
                            </ul>
                            <p className="text-xs text-orange-700 mt-2">💡 <strong>提示:</strong> 調整可輸入正數(增加)或負數(減少),直接修正庫存數量。</p>
                        </div>
                    </div>

                    {/* 物品管理說明 */}
                    <div className="border-b pb-4">
                        <h3 className="text-xl font-bold text-purple-600 mb-4">⚙️ 物品管理功能</h3>

                        {/* 編輯 */}
                        <div className="mb-4 bg-gray-50 border-l-4 border-gray-500 p-4 rounded">
                            <h4 className="font-bold text-gray-800 mb-2">✏️ 編輯</h4>
                            <p className="text-sm text-gray-700 mb-2"><strong>使用時機:</strong></p>
                            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                                <li>修改物品<strong>名稱</strong>時(例:名稱打錯、需要更清楚的名稱)</li>
                                <li>調整物品<strong>分類</strong>時(例:發現分類錯誤)</li>
                                <li>更改<strong>單位</strong>時(例:從「個」改為「箱」)</li>
                                <li>修改<strong>盤點頻率</strong>時</li>
                            </ul>
                            <p className="text-xs text-gray-700 mt-2">⚠️ <strong>注意:</strong> 編輯不會影響庫存數量,只修改物品的基本資訊。</p>
                        </div>

                        {/* 刪除 */}
                        <div className="mb-4 bg-red-50 border-l-4 border-red-600 p-4 rounded">
                            <h4 className="font-bold text-red-800 mb-2">🗑️ 刪除</h4>
                            <p className="text-sm text-gray-700 mb-2"><strong>使用時機:</strong></p>
                            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                                <li>物品<strong>已停用</strong>,不再需要管理時</li>
                                <li>重複建立的物品資料時</li>
                                <li>測試資料需要清除時</li>
                            </ul>
                            <p className="text-xs text-red-700 mt-2">⚠️ <strong>警告:</strong> 刪除物品會同時刪除所有相關的庫存異動記錄,<strong>無法復原</strong>!請謹慎使用。</p>
                        </div>
                    </div>

                    {/* 批次異動與組合管理 */}
                    <div className="border-b pb-4">
                        <h3 className="text-xl font-bold text-indigo-600 mb-4">✨ 批次處理與組合管理</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 新增異動單 */}
                            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded">
                                <h4 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">
                                    <span>📋</span> 新增異動單 (批次處理)
                                </h4>
                                <ul className="text-sm text-gray-600 list-disc list-inside space-y-2">
                                    <li>一次處理多個物品的入庫/出庫</li>
                                    <li>支援快速帶入「組合」</li>
                                    <li>適合日常領料與補貨</li>
                                </ul>
                            </div>

                            {/* 組合管理 */}
                            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                                <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                                    <span>📦</span> 組合管理
                                </h4>
                                <ul className="text-sm text-gray-600 list-disc list-inside space-y-2">
                                    <li>建立常用物品群組 (如: 客房備品)</li>
                                    <li>預設物品數量，一鍵帶入</li>
                                    <li>節省重複選取時間</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* 快速使用流程 */}
                    <div>
                        <h3 className="text-xl font-bold text-green-600 mb-4">🚀 快速使用流程</h3>

                        <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                            <h4 className="font-bold text-blue-800 mb-3">📌 新手入門四步驟</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                <div className="bg-white p-3 rounded shadow-sm">
                                    <div className="font-bold text-blue-600 mb-1">1. 建立倉庫</div>
                                    <div className="text-gray-600">至「倉庫管理」新增您的倉庫據點</div>
                                </div>
                                <div className="bg-white p-3 rounded shadow-sm">
                                    <div className="font-bold text-blue-600 mb-1">2. 初始庫存</div>
                                    <div className="text-gray-600">使用「調整」功能設定現有數量</div>
                                </div>
                                <div className="bg-white p-3 rounded shadow-sm">
                                    <div className="font-bold text-blue-600 mb-1">3. 日常作業</div>
                                    <div className="text-gray-600">使用「入庫/出庫」記錄每日異動</div>
                                </div>
                                <div className="bg-white p-3 rounded shadow-sm">
                                    <div className="font-bold text-blue-600 mb-1">4. 定期盤點</div>
                                    <div className="text-gray-600">列印盤點表，並修正帳面差異</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                        我知道了
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuideModal;
