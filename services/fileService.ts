import mammoth from 'mammoth';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      let encoded = reader.result?.toString().replace(/^data:(.*,)?/, '') || '';
      resolve(encoded);
    };
    reader.onerror = error => reject(error);
  });
};

export const extractTextFromDocx = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (e) {
    console.error("Error extracting docx text", e);
    return "";
  }
};

export const processFile = async (file: File): Promise<{ content: string; type: 'pdf' | 'docx' }> => {
  if (file.type === 'application/pdf') {
    const content = await fileToBase64(file);
    return { content, type: 'pdf' };
  } else if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.endsWith('.docx')
  ) {
    const content = await extractTextFromDocx(file);
    return { content, type: 'docx' };
  }
  throw new Error("Unsupported file type");
};
