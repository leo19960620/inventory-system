import React, { useState, useEffect, useRef } from 'react';

/**
 * 可編輯下拉式選單元件
 * 支援輸入新選項、過濾現有選項、自動完成
 * 
 * @param {string} value - 當前值
 * @param {function} onChange - 值變更時的回調函數
 * @param {Array<string>} options - 可選選項列表
 * @param {function} onAddNewOption - 新增選項時的回調函數(可選)
 * @param {string} placeholder - 輸入框佔位符文字
 */
const EditableComboBox = ({ value, onChange, options, onAddNewOption, placeholder }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');
    const dropdownRef = useRef(null);

    // 同步外部 value 變化
    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    // 過濾選項
    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(inputValue.toLowerCase())
    );

    // 處理輸入變更
    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue);
        setShowDropdown(true);
    };

    // 處理選項選擇
    const handleSelectOption = (opt) => {
        setInputValue(opt);
        onChange(opt);
        setShowDropdown(false);
    };

    // 處理失去焦點
    const handleBlur = async () => {
        setTimeout(async () => {
            setShowDropdown(false);

            // 如果是新選項且不為空,加入清單
            if (inputValue && inputValue.trim() && !options.includes(inputValue) && onAddNewOption) {
                await onAddNewOption(inputValue.trim());
            }
        }, 200);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => setShowDropdown(true)}
                onBlur={handleBlur}
                placeholder={placeholder}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {showDropdown && filteredOptions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredOptions.map(opt => (
                        <div
                            key={opt}
                            onMouseDown={(e) => e.preventDefault()} // 防止觸發 blur
                            onClick={() => handleSelectOption(opt)}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm transition-colors"
                            style={{
                                borderBottom: '1px solid #f0f0f0'
                            }}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EditableComboBox;
