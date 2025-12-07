import React, { useState, useEffect } from 'react';
import { Key, Save, Edit2 } from 'lucide-react';

interface ApiKeyModalProps {
  apiKey: string;
  setApiKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ apiKey, setApiKey }) => {
  const [inputKey, setInputKey] = useState('');
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setInputKey(storedKey);
      setIsEditing(false);
    }
  }, [setApiKey]);

  const handleSave = () => {
    if (inputKey.trim()) {
      localStorage.setItem('gemini_api_key', inputKey);
      setApiKey(inputKey);
      setIsEditing(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  if (!isEditing && apiKey) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={handleEdit}
          className="flex items-center gap-2 bg-white/90 backdrop-blur shadow-lg border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-blue-50 transition-all"
        >
          <Key size={14} /> Chỉnh sửa API Key
        </button>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 flex flex-col sm:flex-row gap-4 items-end sm:items-center justify-between">
      <div className="flex-1 w-full">
        <label className="block text-xs font-bold text-blue-800 uppercase mb-1">
          Google Gemini API Key
        </label>
        <div className="relative">
          <Key className="absolute left-3 top-2.5 text-blue-400" size={16} />
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Dán mã API của bạn vào đây..."
            className="w-full pl-9 pr-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={!inputKey}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-bold shrink-0"
      >
        <Save size={16} /> Lưu vào trình duyệt
      </button>
    </div>
  );
};
