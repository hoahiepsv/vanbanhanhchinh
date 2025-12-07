import React, { useState } from 'react';
import { 
  BookOpen, 
  FileText, 
  Settings, 
  CheckCircle, 
  Play, 
  RotateCcw, 
  Download,
  ChevronRight,
  BrainCircuit,
  Zap,
  Layout,
  Wand2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

import { AppStep, AppModel, FileInput, FormData, OutlineItem } from './types';
import { ApiKeyModal } from './components/ApiKeyModal';
import { FileUpload } from './components/FileUpload';
import { generateOutline, generateFullDocument, extractMetadata } from './services/geminiService';
import { exportToWord } from './utils/exportDocx';

const App: React.FC = () => {
  // Global State
  const [apiKey, setApiKey] = useState<string>('');
  const [step, setStep] = useState<AppStep>(AppStep.SETUP);
  const [model, setModel] = useState<AppModel>(AppModel.FLASH);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Data State
  const [inputs1, setInputs1] = useState<FileInput[]>([]); // Phap quy
  const [inputs2, setInputs2] = useState<FileInput[]>([]); // Tieu chi
  const [inputs3, setInputs3] = useState<FileInput[]>([]); // Mau
  
  const [formData, setFormData] = useState<FormData>({
    documentType: '',
    governingBody: '',
    unitName: '',
    managerName: '',
    schoolYear: new Date().getFullYear() + ' - ' + (new Date().getFullYear() + 1),
  });

  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [finalContent, setFinalContent] = useState<string>('');

  const handleAutoFill = async () => {
    if (!apiKey) return alert("Vui lòng nhập API Key trước khi sử dụng tính năng này.");
    if (inputs2.length === 0) return alert("Vui lòng tải lên 'Input 2' (Tiêu chí/Yêu cầu/Giàn ý) để trích xuất thông tin.");

    setLoading(true);
    setLoadingMessage("Đang điền thông tin tự động...");
    try {
      const extracted = await extractMetadata(apiKey, model, inputs2);
      setFormData(prev => ({
        ...prev,
        documentType: extracted.documentType || prev.documentType,
        governingBody: extracted.governingBody || prev.governingBody,
        unitName: extracted.unitName || prev.unitName,
        managerName: extracted.managerName || prev.managerName,
        schoolYear: extracted.schoolYear || prev.schoolYear
      }));
      setLoading(false);
    } catch (error) {
      console.error(error);
      alert("Không thể trích xuất thông tin. Vui lòng điền thủ công.");
      setLoading(false);
    }
  };

  const handleNextToOutline = async () => {
    if (!apiKey) return alert("Vui lòng nhập API Key");
    if (!formData.documentType) return alert("Vui lòng nhập tên loại văn bản");
    
    setStep(AppStep.OUTLINE);
    setLoading(true);
    setLoadingMessage("Đang phân tích tài liệu và lập giàn ý...");

    try {
      const generatedOutline = await generateOutline(apiKey, model, inputs1, inputs2, inputs3, formData);
      setOutline(generatedOutline);
      setLoading(false);
    } catch (e) {
      console.error(e);
      alert("Có lỗi xảy ra khi tạo giàn ý. Vui lòng thử lại.");
      setStep(AppStep.INPUT);
      setLoading(false);
    }
  };

  const handleGenerateContent = async () => {
    setStep(AppStep.GENERATING);
    setLoading(true);
    setLoadingMessage("Đang viết văn bản chi tiết. Quá trình này có thể mất vài phút...");

    try {
      const content = await generateFullDocument(apiKey, model, inputs1, inputs2, inputs3, formData, outline);
      setFinalContent(content);
      setStep(AppStep.PREVIEW);
      setLoading(false);
    } catch (e) {
      console.error(e);
      alert("Có lỗi xảy ra khi viết văn bản.");
      setStep(AppStep.OUTLINE);
      setLoading(false);
    }
  };

  const toggleOutlineItem = (id: string) => {
    setOutline(prev => prev.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-6"></div>
      <h3 className="text-xl font-semibold text-blue-900 mb-2">{loadingMessage}</h3>
      <p className="text-gray-500">Hệ thống đang sử dụng mô hình {model === AppModel.FLASH ? 'Flash (Tốc độ)' : 'Pro (Phân tích sâu)'} để xử lý...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-full text-blue-800">
               <BookOpen size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wide">Xây Dựng Văn Bản Hành Chính - THCS</h1>
              <p className="text-xs text-blue-200">Bản quyền: Lê Hoà Hiệp (0983.676.470)</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className={`flex items-center gap-2 ${step >= AppStep.INPUT ? 'text-white' : 'text-blue-400'}`}>
              <span className="w-6 h-6 rounded-full border flex items-center justify-center">1</span> Input
            </div>
            <ChevronRight size={16} className="text-blue-500"/>
            <div className={`flex items-center gap-2 ${step >= AppStep.OUTLINE ? 'text-white' : 'text-blue-400'}`}>
               <span className="w-6 h-6 rounded-full border flex items-center justify-center">2</span> Giàn ý
            </div>
             <ChevronRight size={16} className="text-blue-500"/>
            <div className={`flex items-center gap-2 ${step === AppStep.PREVIEW ? 'text-white' : 'text-blue-400'}`}>
               <span className="w-6 h-6 rounded-full border flex items-center justify-center">3</span> Kết quả
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
        <ApiKeyModal apiKey={apiKey} setApiKey={setApiKey} />

        {loading ? renderLoading() : (
          <>
            {/* STEP 1: SETUP & INPUT */}
            {step === AppStep.SETUP || step === AppStep.INPUT ? (
              <div className="animate-fade-in space-y-8">
                {/* Model Selection */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                   <h2 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                     <Settings size={20} /> Cấu hình mô hình AI
                   </h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button 
                        onClick={() => setModel(AppModel.FLASH)}
                        className={`p-4 rounded border-2 flex items-center gap-4 transition-all ${model === AppModel.FLASH ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}
                      >
                        <div className="bg-yellow-100 p-2 rounded text-yellow-600"><Zap size={24}/></div>
                        <div className="text-left">
                          <div className="font-bold">Chế độ Flash (Nhanh)</div>
                          <div className="text-xs text-gray-500">Phản hồi tức thì, phù hợp văn bản đơn giản.</div>
                        </div>
                      </button>

                      <button 
                        onClick={() => setModel(AppModel.PRO)}
                        className={`p-4 rounded border-2 flex items-center gap-4 transition-all ${model === AppModel.PRO ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}
                      >
                        <div className="bg-purple-100 p-2 rounded text-purple-600"><BrainCircuit size={24}/></div>
                         <div className="text-left">
                          <div className="font-bold">Chế độ Pro (Thông minh)</div>
                          <div className="text-xs text-gray-500">Suy luận sâu, phù hợp văn bản phức tạp, nhiều dữ liệu.</div>
                        </div>
                      </button>
                   </div>
                </div>

                {/* Form Data */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 relative">
                   <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                        <FileText size={20} /> Thông tin chung
                      </h2>
                      {inputs2.length > 0 && (
                        <button 
                          onClick={handleAutoFill}
                          className="flex items-center gap-2 text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded hover:bg-indigo-200 font-bold transition-colors"
                        >
                          <Wand2 size={14} /> Điền thông tin tự động
                        </button>
                      )}
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên loại văn bản cần xây dựng</label>
                        <input 
                          type="text" 
                          className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                          placeholder=""
                          value={formData.documentType}
                          onChange={e => setFormData({...formData, documentType: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cơ quan chủ quản</label>
                        <input 
                          type="text" 
                          className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                          placeholder=""
                          value={formData.governingBody}
                          onChange={e => setFormData({...formData, governingBody: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên đơn vị (Trường)</label>
                        <input 
                          type="text" 
                          className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                          placeholder=""
                          value={formData.unitName}
                          onChange={e => setFormData({...formData, unitName: e.target.value})}
                        />
                      </div>
                       <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Người quản lý (Hiệu trưởng)</label>
                        <input 
                          type="text" 
                          className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                          placeholder=""
                          value={formData.managerName}
                          onChange={e => setFormData({...formData, managerName: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Năm học</label>
                        <input 
                          type="text" 
                          className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none"
                          value={formData.schoolYear}
                          onChange={e => setFormData({...formData, schoolYear: e.target.value})}
                        />
                      </div>
                   </div>
                </div>

                {/* Files */}
                <div>
                   <FileUpload 
                      label="Văn bản pháp quy" 
                      description="Các thông tư, hướng dẫn của cấp trên làm căn cứ."
                      files={inputs1} setFiles={setInputs1} 
                   />
                   <FileUpload 
                      label="Tiêu chí & Yêu cầu" 
                      description="Giàn ý sơ bộ, yêu cầu của trường, số liệu báo cáo."
                      files={inputs2} setFiles={setInputs2} 
                   />
                   <FileUpload 
                      label="Mẫu văn bản tham khảo" 
                      description="Văn bản cũ hoặc mẫu của đơn vị khác để học tập phong cách."
                      files={inputs3} setFiles={setInputs3} 
                   />
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={handleNextToOutline}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded shadow-lg flex items-center gap-2 transition-transform active:scale-95"
                  >
                    Tiếp tục: Phân tích & Lập giàn ý <ChevronRight size={20}/>
                  </button>
                </div>
              </div>
            ) : null}

            {/* STEP 2: OUTLINE REVIEW */}
            {step === AppStep.OUTLINE ? (
              <div className="animate-fade-in bg-white p-8 rounded-lg shadow-lg border border-gray-200">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                   <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                     <Layout size={28} /> Duyệt Giàn Ý Dự Kiến
                   </h2>
                   <div className="flex gap-2">
                      <button 
                        onClick={handleNextToOutline} 
                        className="text-gray-600 hover:text-blue-600 px-3 py-1 flex items-center gap-1 text-sm border rounded"
                      >
                         <RotateCcw size={14}/> Phân tích lại
                      </button>
                   </div>
                </div>
                
                <p className="mb-4 text-gray-600 italic">Vui lòng bỏ chọn các mục bạn không muốn đưa vào văn bản.</p>

                <div className="space-y-3 mb-8 max-h-[60vh] overflow-y-auto pr-2">
                  {outline.length === 0 && <p className="text-red-500">Không tạo được giàn ý. Vui lòng thử lại.</p>}
                  {outline.map(item => (
                    <div 
                      key={item.id} 
                      className={`flex items-start gap-3 p-3 rounded hover:bg-gray-50 cursor-pointer border ${item.selected ? 'border-blue-200 bg-blue-50/50' : 'border-transparent'}`}
                      onClick={() => toggleOutlineItem(item.id)}
                    >
                      <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${item.selected ? 'bg-blue-600 border-blue-600' : 'border-gray-400 bg-white'}`}>
                        {item.selected && <CheckCircle size={14} className="text-white" />}
                      </div>
                      <div className={`${item.level === 1 ? 'font-bold text-lg text-gray-800' : 'text-gray-700 ml-6'}`}>
                        {item.title}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <button 
                    onClick={() => setStep(AppStep.INPUT)}
                    className="text-gray-600 px-6 py-2 hover:bg-gray-100 rounded"
                  >
                    Quay lại
                  </button>
                  <button 
                    onClick={handleGenerateContent}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded shadow-lg flex items-center gap-2 transition-transform active:scale-95"
                  >
                    <Play size={20}/> Tiến hành viết văn bản
                  </button>
                </div>
              </div>
            ) : null}

            {/* STEP 3 (GENERATING is handled by loading state) */}

            {/* STEP 4: PREVIEW & EXPORT */}
            {step === AppStep.PREVIEW ? (
              <div className="animate-fade-in flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-blue-900">Xem trước văn bản</h2>
                   <div className="flex gap-3">
                     <button 
                        onClick={() => setStep(AppStep.OUTLINE)}
                        className="text-blue-700 border border-blue-200 bg-white hover:bg-blue-50 px-4 py-2 rounded flex items-center gap-2 shadow-sm"
                      >
                         <Settings size={16}/> Chỉnh sửa giàn ý
                      </button>
                      <button 
                        onClick={() => exportToWord(finalContent, formData)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded shadow flex items-center gap-2 font-bold"
                      >
                         <Download size={20}/> Xuất file Word (.docx)
                      </button>
                   </div>
                </div>

                {/* Preview Paper */}
                <div 
                  className="bg-white p-12 shadow-lg border border-gray-200 min-h-[800px] mx-auto w-full max-w-[21cm]"
                  style={{ fontFamily: '"Times New Roman", Times, serif', color: 'black' }}
                >
                  {/* Document Header Simulation */}
                  <div className="flex justify-between mb-4 text-center gap-4">
                    <div className="w-5/12 flex flex-col items-center">
                       <p className="uppercase text-sm text-black">{formData.governingBody || "UBND................."}</p>
                       <p className="uppercase font-bold text-sm text-black">{formData.unitName}</p>
                       <div className="w-1/3 border-b border-black my-1"></div>
                    </div>
                    <div className="w-7/12 flex flex-col items-center">
                       <p className="uppercase font-bold text-sm text-black">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                       <p className="font-bold underline underline-offset-4 text-sm text-black">Độc lập - Tự do - Hạnh phúc</p>
                       <div className="w-full text-right mt-2 italic text-sm pr-8 text-black">
                         ........., ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                       </div>
                    </div>
                  </div>

                  <div className="preview-content text-justify text-lg leading-relaxed text-black">
                    <ReactMarkdown 
                      remarkPlugins={[remarkMath, remarkGfm]} 
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        // Override basic elements to match Word style preview with Black Color
                        h1: ({node, ...props}) => <h1 className="text-center uppercase font-bold text-2xl my-6 text-black" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-center uppercase font-bold text-lg mt-6 mb-4 text-black" {...props} />,
                        h3: ({node, ...props}) => <h3 className="font-bold text-lg mt-4 mb-2 text-black" {...props} />,
                        p: ({node, ...props}) => <p className="mb-3 leading-7 indent-8 text-black" {...props} />,
                        table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="w-full border-collapse border border-black text-black" {...props} /></div>,
                        th: ({node, ...props}) => <th className="border border-black p-2 bg-gray-100 font-bold align-middle text-center text-black" {...props} />,
                        td: ({node, ...props}) => <td className="border border-black p-2 align-top text-black" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-black" {...props} />,
                        li: ({node, ...props}) => <li className="text-black" {...props} />,
                      }}
                    >
                      {finalContent}
                    </ReactMarkdown>
                  </div>
                  
                  {/* Document Footer Simulation */}
                  <div className="mt-16 flex justify-between px-0">
                    <div className="text-left w-1/2 text-sm leading-relaxed text-black">
                       <p className="font-bold italic text-black">Nơi nhận:</p>
                       <p className="text-black">- Phòng Giáo dục và Đào tạo (để báo cáo);</p>
                       <p className="text-black">- Toàn thể viên chức, người lao động {formData.unitName} (để thực hiện);</p>
                       <p className="text-black">- Lưu: VT.</p>
                    </div>
                    <div className="text-center w-1/2 text-sm text-black">
                       <p className="uppercase font-bold text-black">HIỆU TRƯỞNG {formData.unitName.toUpperCase()}</p>
                       <br/><br/><br/><br/>
                       <p className="font-bold uppercase text-black">{formData.managerName}</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-center mt-8 pb-8 text-gray-400 italic text-sm">
                   Create by Hoà Hiệp AI – 0983.676.470 | Trang 1
                </div>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
};

export default App;