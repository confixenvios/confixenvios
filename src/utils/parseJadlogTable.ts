import * as XLSX from 'xlsx';

export interface JadlogSheetData {
  sheetName: string;
  headers: string[];
  rowCount: number;
  sampleData: any[];
}

export async function parseJadlogTable(filePath: string): Promise<JadlogSheetData[]> {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const sheetsData: JadlogSheetData[] = [];
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (jsonData.length > 0) {
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1);
        
        sheetsData.push({
          sheetName,
          headers,
          rowCount: dataRows.length,
          sampleData: dataRows.slice(0, 5) // Primeiras 5 linhas como amostra
        });
      }
    });
    
    return sheetsData;
  } catch (error) {
    console.error('Erro ao processar tabela Jadlog:', error);
    return [];
  }
}

export async function getAllJadlogData(filePath: string) {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const allData: Record<string, any[]> = {};
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      allData[sheetName] = jsonData;
    });
    
    return allData;
  } catch (error) {
    console.error('Erro ao processar tabela Jadlog:', error);
    return {};
  }
}
