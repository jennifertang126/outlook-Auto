import * as XLSX from 'xlsx'

interface ParsedExcel {
  columns: string[]
  rows: Record<string, string>[]
  rowCount: number
}

export class ExcelService {
  parseExcel(filePath: string): ParsedExcel {
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet)

    if (rawData.length === 0) {
      return { columns: [], rows: [], rowCount: 0 }
    }

    const columns = Object.keys(rawData[0])

    const rows = rawData.map((row) => {
      const normalized: Record<string, string> = {}
      for (const key of columns) {
        normalized[key] = row[key] != null ? String(row[key]).trim() : ''
      }
      return normalized
    })

    return { columns, rows, rowCount: rows.length }
  }

  validateColumns(
    columns: string[],
    requiredColumns: string[]
  ): { valid: boolean; missing: string[] } {
    const lowerColumns = columns.map((c) => c.toLowerCase())
    const missing = requiredColumns.filter((r) => !lowerColumns.includes(r.toLowerCase()))
    return { valid: missing.length === 0, missing }
  }
}
