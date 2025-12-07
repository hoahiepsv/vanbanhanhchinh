import React, { useRef } from 'react';
import { Upload, X, FileText, File as FileIcon } from 'lucide-react';
import { FileInput } from '../types';
import { processFile } from '../services/fileService';

interface FileUploadProps {
  label: string;
  description: string;
  files: FileInput[];
  setFiles: React.Dispatch<React.SetStateAction<FileInput[]>>;
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, description, files, setFiles }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: FileInput[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        try {
          const processed = await processFile(file);
          newFiles.push({
            id: Math.random().toString(36).substring(7),
            file,
            content: processed.content,
            type: processed.type
          });
        } catch (err) {
          alert(`Lỗi đọc file ${file.name}. Chỉ hỗ trợ .docx và .pdf`);
        }
      }
      setFiles(prev => [...prev, ...newFiles]);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  return (
    <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-lg font-semibold text-blue-800">{label}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 transition-colors text-sm font-medium"
        >
          <Upload size={16} /> Thêm tệp
        </button>
      </div>

      <input
        type="file"
        multiple
        accept=".pdf,.docx"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <div className="space-y-2 mt-3">
        {files.length === 0 && (
          <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded text-gray-400 text-sm">
            Chưa có tệp nào được tải lên (Hỗ trợ .docx, .pdf)
          </div>
        )}
        {files.map(f => (
          <div key={f.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-100">
            <div className="flex items-center gap-3 overflow-hidden">
              {f.type === 'pdf' ? <FileText size={18} className="text-red-500" /> : <FileIcon size={18} className="text-blue-500" />}
              <span className="text-sm truncate max-w-xs">{f.file.name}</span>
            </div>
            <button onClick={() => removeFile(f.id)} className="text-gray-400 hover:text-red-500">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
