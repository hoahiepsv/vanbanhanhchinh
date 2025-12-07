import * as docx from 'docx';
import FileSaver from 'file-saver';
import { FormData } from '../types';

// Helper to process markdown formatting
const createTextRuns = (text: string, bold = false, italic = false): docx.TextRun[] => {
    // Basic bold parser: **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return new docx.TextRun({
                text: part.replace(/\*\*/g, ''),
                bold: true,
                font: "Times New Roman",
                size: 26, // 13pt
                color: "000000",
            });
        }
        return new docx.TextRun({
            text: part,
            bold: bold,
            italics: italic,
            font: "Times New Roman",
            size: 26,
            color: "000000",
        });
    });
};

const parseContentToDocx = (text: string): (docx.Paragraph | docx.Table)[] => {
  const lines = text.split('\n');
  const blocks: (docx.Paragraph | docx.Table)[] = [];
  
  let tableBuffer: string[] = [];
  let inTable = false;

  const flushTable = () => {
      if (tableBuffer.length > 0) {
          const rowsToProcess = tableBuffer.filter(line => !line.trim().match(/^\|?(\s*:?-+:?\s*\|)+\s*$/));
          
          if (rowsToProcess.length > 0) {
              const tableRows = rowsToProcess.map((rowLine, index) => {
                  let cells = rowLine.split('|');
                  if (rowLine.trim().startsWith('|')) cells.shift();
                  if (rowLine.trim().endsWith('|')) cells.pop();
                  
                  return new docx.TableRow({
                      children: cells.map(cellText => {
                          return new docx.TableCell({
                              children: [
                                  new docx.Paragraph({
                                      children: createTextRuns(cellText.trim(), index === 0), // Bold header
                                      alignment: docx.AlignmentType.LEFT,
                                      spacing: { before: 60, after: 60 }
                                  })
                              ],
                              verticalAlign: docx.VerticalAlign.CENTER,
                              borders: {
                                  top: { style: docx.BorderStyle.SINGLE, size: 1, color: "000000" },
                                  bottom: { style: docx.BorderStyle.SINGLE, size: 1, color: "000000" },
                                  left: { style: docx.BorderStyle.SINGLE, size: 1, color: "000000" },
                                  right: { style: docx.BorderStyle.SINGLE, size: 1, color: "000000" },
                              }
                          });
                      })
                  });
              });

              blocks.push(new docx.Table({
                  rows: tableRows,
                  width: { size: 100, type: docx.WidthType.PERCENTAGE },
                  indent: { size: 0, type: docx.WidthType.DXA },
              }));
          }
          tableBuffer = [];
      }
      inTable = false;
  };

  lines.forEach(line => {
    const trimmed = line.trim();
    
    // Check for Table Line
    if (trimmed.startsWith('|')) {
        inTable = true;
        tableBuffer.push(trimmed);
        return;
    } else {
        if (inTable) {
            flushTable();
        }
    }

    if (!trimmed) {
        blocks.push(new docx.Paragraph({ text: "" }));
        return;
    }

    // Handle Headings
    const isH1 = trimmed.startsWith('# ');
    const isH2 = trimmed.startsWith('## ');
    const isH3 = trimmed.startsWith('### ');
    const isBoldHeader = trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length < 100;

    if (isH1 || isH2 || isH3 || isBoldHeader) {
       let level = docx.HeadingLevel.HEADING_2; // Default
       if (isH1) level = docx.HeadingLevel.HEADING_1;
       if (isH3) level = docx.HeadingLevel.HEADING_3;
       
       const cleanText = trimmed.replace(/^#+\s/, '').replace(/\*\*/g, '');
       
       // Note: Removed 'text' property from Paragraph when children are used to avoid duplication bug
       blocks.push(new docx.Paragraph({
        heading: level,
        alignment: docx.AlignmentType.CENTER,
        spacing: { before: 240, after: 240 },
        children: [
            new docx.TextRun({
                text: cleanText.toUpperCase(),
                bold: true,
                font: "Times New Roman",
                size: level === docx.HeadingLevel.HEADING_1 ? 28 : 26, // 14pt or 13pt
                color: "000000"
            })
        ]
      }));
    } else {
      // Normal paragraph
      blocks.push(new docx.Paragraph({
        children: createTextRuns(trimmed),
        spacing: { line: 360, before: 60, after: 60 }, // 1.5 lines
        alignment: docx.AlignmentType.JUSTIFIED,
        indent: { firstLine: 720 } // Indent first line ~1.27cm
      }));
    }
  });

  if (inTable) flushTable();
  return blocks;
};

export const exportToWord = async (content: string, formData: FormData) => {
  const docBlocks = parseContentToDocx(content);
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  // Header Table
  const headerTable = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    borders: docx.TableBorders.NONE,
    rows: [
      new docx.TableRow({
        children: [
          // Left Column: Unit Info
          new docx.TableCell({
            width: { size: 45, type: docx.WidthType.PERCENTAGE },
            children: [
              new docx.Paragraph({
                text: (formData.governingBody || "UBND.................").toUpperCase(),
                alignment: docx.AlignmentType.CENTER,
                children: [new docx.TextRun({ font: "Times New Roman", size: 24, color: "000000" })]
              }),
              new docx.Paragraph({
                text: formData.unitName.toUpperCase(),
                alignment: docx.AlignmentType.CENTER,
                children: [new docx.TextRun({ font: "Times New Roman", size: 24, bold: true, color: "000000" })]
              }),
              new docx.Paragraph({
                   alignment: docx.AlignmentType.CENTER,
                   children: [
                       new docx.TextRun({
                           text: "__________", // Fallback visual, better than border hack in many cases for simple lines
                           font: "Times New Roman",
                           size: 24,
                           bold: true,
                           color: "000000" 
                       })
                   ],
                   spacing: { after: 100 }
              })
            ],
          }),
          // Right Column: National Motto & Date
          new docx.TableCell({
            width: { size: 55, type: docx.WidthType.PERCENTAGE },
            children: [
              new docx.Paragraph({
                text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
                alignment: docx.AlignmentType.CENTER,
                children: [new docx.TextRun({ font: "Times New Roman", size: 24, bold: true, color: "000000" })]
              }),
              new docx.Paragraph({
                text: "Độc lập - Tự do - Hạnh phúc",
                alignment: docx.AlignmentType.CENTER,
                children: [new docx.TextRun({ font: "Times New Roman", size: 26, bold: true, underline: { type: docx.UnderlineType.SINGLE }, color: "000000" })]
              }),
               new docx.Paragraph({
                   text: `........., ngày ${day} tháng ${month} năm ${year}`,
                   alignment: docx.AlignmentType.RIGHT, // TCVN alignment usually right or center relative to motto
                   indent: { right: 300 },
                   spacing: { before: 200 },
                   children: [new docx.TextRun({ font: "Times New Roman", size: 26, italics: true, color: "000000" })]
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Footer Table (Signature)
  const footerTable = new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      borders: docx.TableBorders.NONE,
      rows: [
          new docx.TableRow({
              children: [
                  new docx.TableCell({
                      width: { size: 50, type: docx.WidthType.PERCENTAGE },
                      children: [
                          new docx.Paragraph({
                              children: [new docx.TextRun({ text: "Nơi nhận:", bold: true, italics: true, font: "Times New Roman", size: 24, color: "000000" })]
                          }),
                          new docx.Paragraph({
                              children: [new docx.TextRun({ text: "- Phòng Giáo dục và Đào tạo (để báo cáo);", font: "Times New Roman", size: 24, color: "000000" })]
                          }),
                          new docx.Paragraph({
                              children: [new docx.TextRun({ text: `- Toàn thể viên chức, người lao động ${formData.unitName} (để thực hiện);`, font: "Times New Roman", size: 24, color: "000000" })]
                          }),
                          new docx.Paragraph({
                              children: [new docx.TextRun({ text: "- Lưu: VT.", font: "Times New Roman", size: 24, color: "000000" })]
                          })
                      ]
                  }),
                  new docx.TableCell({
                      width: { size: 50, type: docx.WidthType.PERCENTAGE },
                      children: [
                          new docx.Paragraph({
                              text: `HIỆU TRƯỞNG ${formData.unitName.toUpperCase()}`,
                              alignment: docx.AlignmentType.CENTER,
                              children: [new docx.TextRun({ font: "Times New Roman", size: 24, bold: true, allCaps: true, color: "000000" })]
                          }),
                          new docx.Paragraph({ text: "", spacing: { before: 1000 } }), // Space for signature
                          new docx.Paragraph({
                              text: formData.managerName,
                              alignment: docx.AlignmentType.CENTER,
                              children: [new docx.TextRun({ font: "Times New Roman", size: 24, bold: true, color: "000000" })]
                          })
                      ]
                  })
              ]
          })
      ]
  });

  const doc = new docx.Document({
    styles: {
        default: {
            document: {
                run: {
                    font: "Times New Roman",
                    size: 26,
                    color: "000000",
                },
            },
            heading1: {
                run: { font: "Times New Roman", size: 28, bold: true, color: "000000" },
                paragraph: { alignment: docx.AlignmentType.CENTER }
            },
            heading2: {
                run: { font: "Times New Roman", size: 26, bold: true, color: "000000" },
                paragraph: { alignment: docx.AlignmentType.CENTER }
            },
            heading3: {
                run: { font: "Times New Roman", size: 26, bold: true, color: "000000" },
                paragraph: { alignment: docx.AlignmentType.LEFT }
            }
        },
    },
    sections: [{
      properties: {
          page: {
              margin: {
                  top: 1134, // 2cm
                  bottom: 1134,
                  left: 1701, // 3cm
                  right: 1134, // 2cm
              }
          }
      },
      footers: {
        default: new docx.Footer({
            children: [
                new docx.Paragraph({
                    alignment: docx.AlignmentType.CENTER,
                    children: [
                        new docx.TextRun({
                            text: "Create by Hoà Hiệp AI – 0983.676.470  |  Trang ",
                            font: "Times New Roman",
                            size: 18, // 9pt
                            italics: true,
                            color: "888888"
                        }),
                        new docx.TextRun({
                            children: [docx.PageNumber.CURRENT],
                            font: "Times New Roman",
                            size: 18, // 9pt
                            italics: true,
                            color: "888888"
                        }),
                    ]
                })
            ]
        })
      },
      children: [
        headerTable,
        new docx.Paragraph({ text: "", spacing: { after: 400 } }),
        ...docBlocks,
        new docx.Paragraph({ text: "", spacing: { after: 400 } }),
        footerTable,
      ],
    }],
  });

  const blob = await docx.Packer.toBlob(doc);
  const save = (FileSaver as any).saveAs || FileSaver;
  save(blob, `${formData.documentType.replace(/\s+/g, '_') || 'Van_ban'}.docx`);
};