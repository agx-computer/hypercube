export type FieldType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "json"
  | "unknown"

export interface Field {
  name: string
  type: FieldType
  nullable: boolean
  description?: string
}

export interface Relation {
  field: string
  entity: string
  targetField: string
}

export interface Entity {
  name: string
  key: string
  fields: Field[]
  relations: Relation[]
  description?: string
}

export interface SchemaModel {
  entities: Entity[]
}
