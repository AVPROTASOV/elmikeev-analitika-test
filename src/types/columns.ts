export interface ColumnDef {
  key: string
  label?: string
  width?: number
  formatter?: (val: any, row: Record<string, any>) => any
}
