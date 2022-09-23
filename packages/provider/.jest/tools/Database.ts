export interface BaseTableRecord {
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export type TableRecord<T> = T & BaseTableRecord

export interface FindOptions {
  includeDeleted?: boolean
}

export class Table {
  private _records: TableRecord<Record<string, unknown>>[] = []

  public insertOne<T>(record: T): TableRecord<T> {
    const tableRecord = { ...record, createdAt: new Date(), updatedAt: new Date(), deletedAt: null }
    this._records.push(tableRecord)
    return tableRecord
  }

  public count(options: FindOptions = {}) {
    const { includeDeleted = false } = options
    return this._records.reduce((count, record) => (!includeDeleted && record.deletedAt) ? count : count + 1, 0)
  }

  public findOne<T = Record<string, unknown>>(fn: (record: TableRecord<T>) => boolean = () => true, options: FindOptions = {}): TableRecord<T> | null {
    const { includeDeleted = false } = options
    return this._records.find(record => (includeDeleted || !record.deletedAt) && fn(record as TableRecord<T>)) as TableRecord<T> ?? null
  }

  public findOneOrFail<T = Record<string, unknown>>(fn: (record: TableRecord<T>) => boolean = () => true, options: FindOptions = {}): TableRecord<T> {
    const { includeDeleted = false } = options
    const record = this._records.find(record => (includeDeleted || !record.deletedAt) && fn(record as TableRecord<T>)) as TableRecord<T> ?? null
    if (!record) throw new Error("Not find");
    return record
  }

  public find<T = Record<string, unknown>>(fn: (record: TableRecord<T>) => boolean = () => true, options: FindOptions = {}): TableRecord<T>[] {
    const { includeDeleted = false } = options
    return this._records.filter(record => (includeDeleted || !record.deletedAt) && fn!(record as TableRecord<T>)) as TableRecord<T>[]
  }

  public softDelete<T = Record<string, unknown>>(fn?: (record: TableRecord<T>) => boolean) {
    this.find(fn).forEach(record => Object.assign(record, { deletedAt: new Date() }))
  }

  public softDeleteOne<T = Record<string, unknown>>(fn?: (record: TableRecord<T>) => boolean) {
    const record = this.findOne(fn)
    if (record) return Object.assign(record, { deletedAt: new Date() })
    return record
  }

  public update<T = Record<string, unknown>>(update: Partial<T> | ((record: TableRecord<T>) => TableRecord<T> | void), fn?: (record: TableRecord<T>) => boolean): TableRecord<T>[] {
    const updater = (record: TableRecord<T>) => {
      if (typeof update === 'object') return Object.assign(record, update, { updatedAt: new Date() })

      return Object.assign(update(record) ?? record, { updatedAt: new Date() })
    }

    return this.find(fn).map(record => updater(record))
  }

  public updateOne<T = Record<string, unknown>>(update: Partial<T> | ((record: TableRecord<T>) => TableRecord<T> | void), fn?: (record: TableRecord<T>) => boolean): TableRecord<T> | null {
    const record = this.findOne<T>(fn)

    if (!record) return null

    if (typeof update === 'object') return Object.assign(record, update, { updatedAt: new Date() })

    return Object.assign(update(record) ?? record, { updatedAt: new Date() })
  }
}

export const Database = (): Readonly<Record<string, Table>> => {
  return new Proxy({} as Record<string | symbol, Table>, {
    get(target, p) {
      if (!target[p]) target[p] = new Table()
      return target[p]
    },
  })
}
