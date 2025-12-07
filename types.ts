export enum AppModel {
  FLASH = 'gemini-2.5-flash',
  PRO = 'gemini-3-pro-preview'
}

export interface FileInput {
  id: string;
  file: File;
  content: string; // Base64 for PDF, Text for Docx
  type: 'pdf' | 'docx';
}

export interface FormData {
  documentType: string;
  governingBody: string; // Cơ quan chủ quản (VD: UBND Quận/Huyện/TP)
  unitName: string;
  managerName: string;
  schoolYear: string;
}

export interface OutlineItem {
  id: string;
  title: string;
  selected: boolean;
  level: number; // 1 for main, 2 for sub
}

export enum AppStep {
  SETUP = 0,
  INPUT = 1,
  OUTLINE = 2,
  GENERATING = 3,
  PREVIEW = 4
}