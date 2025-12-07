import { GoogleGenAI } from "@google/genai";
import { AppModel, FileInput, FormData, OutlineItem } from "../types";

const getSystemInstruction = () => `
Bạn là một chuyên gia soạn thảo văn bản hành chính trong lĩnh vực giáo dục, đặc biệt là cấp Trung học cơ sở (THCS).
Nhiệm vụ của bạn là phân tích các tài liệu đầu vào và soạn thảo văn bản mới tuân thủ nghiêm ngặt các quy định pháp luật và thể thức văn bản hành chính Việt Nam (TCVN 01-1:2011).

Quy tắc quan trọng:
1. Văn phong trang trọng, chính xác, khách quan.
2. Cấu trúc rõ ràng, đánh số mục theo quy định (I, 1, a...).
3. Nếu có công thức toán học PHỨC TẠP (tích phân, phân số...), hãy sử dụng định dạng LaTeX đặt trong dấu $. Ví dụ: $E = mc^2$.
4. KHÔNG SỬ DỤNG DẤU $ CHO SỐ PHẦN TRĂM ĐƠN GIẢN. Viết "50%" thay vì "$50%$".
5. TRÌNH BÀY BẢNG BIỂU:
   - Sử dụng Markdown Table chuẩn.
   - KHÔNG dùng ASCII art hay vẽ hình bằng ký tự text.
   - KHÔNG sử dụng các thẻ lạ như [CENTER], [LEFT], [b]. Chỉ sử dụng Markdown chuẩn (**in đậm**, *in nghiêng*).
6. Luôn tuân thủ mẫu của Input 3 (nếu có) về cách trình bày tiêu đề và cấu trúc.
`;

// Helper to add files
const addFilesToParts = (parts: any[], files: FileInput[], label: string) => {
  if (files.length > 0) parts.push({ text: `\n--- BẮT ĐẦU ${label} ---\n` });
  files.forEach(f => {
    if (f.type === 'pdf') {
      parts.push({ inlineData: { mimeType: 'application/pdf', data: f.content } });
    } else {
      parts.push({ text: `Nội dung file ${f.file.name}: \n${f.content}` });
    }
  });
  if (files.length > 0) parts.push({ text: `\n--- KẾT THÚC ${label} ---\n` });
};

export const extractMetadata = async (
  apiKey: string,
  model: AppModel,
  inputs2: FileInput[]
): Promise<Partial<FormData>> => {
  if (inputs2.length === 0) return {};

  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [{ text: `
    Phân tích các file đính kèm (Input 2 - Tiêu chí/Yêu cầu/Giàn ý) và trích xuất các thông tin sau để điền vào biểu mẫu.
    Trả về định dạng JSON thuần túy (không markdown block) với các trường sau:
    {
      "documentType": "Tên loại văn bản cần xây dựng (ví dụ: Kế hoạch...)",
      "governingBody": "Tên cơ quan chủ quản (ví dụ: UBND Thành phố...)",
      "unitName": "Tên đơn vị/Trường (ví dụ: Trường THCS...)",
      "managerName": "Tên người quản lý/Hiệu trưởng",
      "schoolYear": "Năm học (ví dụ: 2024 - 2025)"
    }
    Nếu không tìm thấy thông tin nào, hãy để trống chuỗi đó. Ưu tiên lấy thông tin mới nhất.
  `}];

  addFilesToParts(parts, inputs2, "INPUT 2");

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: { responseMimeType: "application/json" }
    });

    let text = response.text || "{}";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Error extracting metadata:", error);
    return {};
  }
};

export const generateOutline = async (
  apiKey: string,
  model: AppModel,
  inputs1: FileInput[],
  inputs2: FileInput[],
  inputs3: FileInput[],
  formData: FormData
): Promise<OutlineItem[]> => {
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
  HÃY ĐÓNG VAI CHUYÊN GIA HÀNH CHÍNH.
  
  NHIỆM VỤ: Lập giàn ý chi tiết cho văn bản: "${formData.documentType}"
  
  THÔNG TIN CƠ BẢN:
  - Đơn vị: ${formData.unitName}
  - Người quản lý: ${formData.managerName}
  - Năm học: ${formData.schoolYear}
  
  DỮ LIỆU ĐẦU VÀO:
  1. Văn bản pháp quy (Input 1): Dùng làm căn cứ pháp lý.
  2. Yêu cầu/Tiêu chí (Input 2): Dùng làm nội dung chi tiết bắt buộc.
  3. Mẫu tham khảo (Input 3): Dùng làm khung sườn, cấu trúc đề mục.
  
  YÊU CẦU OUTPUT:
  Trả về một danh sách JSON thuần túy (không bọc trong markdown code block) các mục của giàn ý.
  
  QUAN TRỌNG VỀ ĐỊNH DẠNG JSON:
  1. JSON phải hợp lệ 100%.
  2. Nếu nội dung có chứa dấu gạch chéo ngược "\\" (ví dụ trong công thức LaTeX), BẠN BẮT BUỘC PHẢI ESCAPE NÓ thành "\\\\" (2 dấu gạch chéo).
     Ví dụ SAI: "title": "Công thức \alpha"
     Ví dụ ĐÚNG: "title": "Công thức \\alpha"
  3. Không để ký tự xuống dòng (newline) trực tiếp trong chuỗi giá trị.
  
  Cấu trúc JSON mong muốn:
  [
    { "id": "1", "title": "I. CĂN CỨ PHÁP LÝ", "level": 1 },
    { "id": "2", "title": "1. Luật Giáo dục...", "level": 2 },
    ...
  ]
  
  LƯU Ý NỘI DUNG: 
  - KHÔNG bao gồm phần "Quốc hiệu, Tiêu ngữ" (Cộng hòa xã hội...) hay phần "Số hiệu văn bản" trong giàn ý vì phần này là cố định. 
  - Bắt đầu từ phần Tiêu đề văn bản hoặc phần I. Căn cứ / Đặt vấn đề.
  `;

  const parts: any[] = [{ text: prompt }];

  addFilesToParts(parts, inputs1, "INPUT 1 (PHÁP QUY)");
  addFilesToParts(parts, inputs2, "INPUT 2 (TIÊU CHÍ/YÊU CẦU)");
  addFilesToParts(parts, inputs3, "INPUT 3 (MẪU THAM KHẢO)");

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        systemInstruction: getSystemInstruction(),
      }
    });

    let text = response.text || "[]";
    
    // Robust parsing: Extract JSON array from text in case there's extra chatter
    // and clean up potential markdown formatting
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const startIndex = text.indexOf('[');
    const endIndex = text.lastIndexOf(']');
    
    if (startIndex !== -1 && endIndex !== -1) {
      text = text.substring(startIndex, endIndex + 1);
    }

    const items = JSON.parse(text);
    
    return items.map((item: any) => ({
      ...item,
      selected: true
    }));
  } catch (error) {
    console.error("Error generating outline:", error);
    // You might want to throw a specific error or return an empty array depending on UX needs
    throw error;
  }
};

export const generateFullDocument = async (
  apiKey: string,
  model: AppModel,
  inputs1: FileInput[],
  inputs2: FileInput[],
  inputs3: FileInput[],
  formData: FormData,
  approvedOutline: OutlineItem[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });

  const outlineText = approvedOutline
    .filter(item => item.selected)
    .map(item => item.title)
    .join("\n");

  const prompt = `
  HÃY VIẾT TOÀN BỘ NỘI DUNG VĂN BẢN: "${formData.documentType}".
  
  THÔNG TIN:
  - Trường: ${formData.unitName}
  - Hiệu trưởng: ${formData.managerName}
  - Năm học: ${formData.schoolYear}
  
  DỰA TRÊN GIÀN Ý ĐÃ ĐƯỢC DUYỆT SAU ĐÂY:
  ${outlineText}
  
  YÊU CẦU CHI TIẾT:
  1. Viết đầy đủ nội dung cho từng mục trong giàn ý.
  2. Sử dụng thông tin từ Input 1 để trích dẫn luật chính xác.
  3. Sử dụng thông tin từ Input 2 để điền các chỉ tiêu, số liệu, yêu cầu cụ thể.
  4. Văn phong Input 3.
  5. ĐỊNH DẠNG QUAN TRỌNG:
     - TUYỆT ĐỐI KHÔNG viết lại phần Quốc hiệu, Tiêu ngữ (Cộng hòa xã hội...) và Tên đơn vị ở đầu văn bản (Phần mềm sẽ tự động chèn).
     - HÃY BẮT ĐẦU NGAY BẰNG TIÊU ĐỀ VĂN BẢN (Căn giữa, in đậm). Ví dụ:
       # QUY CHẾ
       ## ĐÁNH GIÁ, XẾP LOẠI...
     - Các đề mục lớn (Phần I, Phần II...) sử dụng Markdown Heading 2 (##) hoặc 3 (###).
     - Sử dụng Markdown thuần túy. KHÔNG DÙNG THẺ TỰ CHẾ NHƯ [CENTER], [b].
     - Bảng biểu dùng Markdown Table chuẩn.
     - Công thức toán học (nếu có) dùng LaTeX trong dấu $.
  
  Lưu ý: Nếu Input 2 có yêu cầu vẽ biểu đồ, hãy mô tả chi tiết biểu đồ đó bằng lời hoặc tạo bảng số liệu thay thế để người dùng có thể hình dung.
  `;

  const parts: any[] = [{ text: prompt }];

  addFilesToParts(parts, inputs1, "INPUT 1");
  addFilesToParts(parts, inputs2, "INPUT 2");
  addFilesToParts(parts, inputs3, "INPUT 3");

  const config: any = {
      systemInstruction: getSystemInstruction(),
  };
  
  const response = await ai.models.generateContent({
    model: model,
    contents: { parts },
    config
  });

  return response.text || "";
};