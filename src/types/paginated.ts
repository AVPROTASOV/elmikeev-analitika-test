export interface PaginatedMeta {
  current_page: number
  per_page: number
  total?: number
  last_page?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta?: PaginatedMeta
  // иногда Laravel-сущности кладут часть полей в корень — обработаем гибко
  [k: string]: any
}
