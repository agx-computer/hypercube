import { sql } from "kysely"
import type { Db } from "../db"
import type { Entity, Field, FieldType, Relation, SchemaModel } from "../model"

function fieldType(dataType: string): FieldType {
  const t = dataType.toLowerCase()
  if (t.includes("char") || t === "text" || t === "uuid" || t === "citext") {
    return "text"
  }
  if (
    t === "smallint" ||
    t === "integer" ||
    t === "bigint" ||
    t === "numeric" ||
    t === "decimal" ||
    t === "real" ||
    t === "double precision" ||
    t === "money"
  ) {
    return "number"
  }
  if (t === "boolean") return "boolean"
  if (t === "date") return "date"
  if (t.startsWith("timestamp") || t.startsWith("time")) return "datetime"
  if (t === "json" || t === "jsonb") return "json"
  return "unknown"
}

export async function introspect(db: Db, schema: string): Promise<SchemaModel> {
  const tables = (
    await sql<{ table_name: string; comment: string | null }>`
      select
        t.table_name,
        obj_description(
          (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass
        ) as comment
      from information_schema.tables t
      where t.table_schema = ${schema} and t.table_type = 'BASE TABLE'
      order by t.table_name
    `.execute(db)
  ).rows

  const columns = (
    await sql<{
      table_name: string
      column_name: string
      data_type: string
      is_nullable: string
      comment: string | null
    }>`
      select
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        col_description(
          (quote_ident(c.table_schema) || '.' || quote_ident(c.table_name))::regclass,
          c.ordinal_position
        ) as comment
      from information_schema.columns c
      where c.table_schema = ${schema}
      order by c.table_name, c.ordinal_position
    `.execute(db)
  ).rows

  const primaryKeys = (
    await sql<{ table_name: string; column_name: string }>`
      select tc.table_name, kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_name = tc.constraint_name
        and kcu.table_schema = tc.table_schema
      where tc.table_schema = ${schema} and tc.constraint_type = 'PRIMARY KEY'
      order by kcu.ordinal_position
    `.execute(db)
  ).rows

  const foreignKeys = (
    await sql<{
      table_name: string
      column_name: string
      foreign_table: string
      foreign_column: string
    }>`
      select
        tc.table_name,
        kcu.column_name,
        ccu.table_name as foreign_table,
        ccu.column_name as foreign_column
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_name = tc.constraint_name
        and kcu.table_schema = tc.table_schema
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = tc.constraint_name
        and ccu.table_schema = tc.table_schema
      where tc.table_schema = ${schema} and tc.constraint_type = 'FOREIGN KEY'
    `.execute(db)
  ).rows

  const entities: Entity[] = []
  for (const table of tables) {
    const fields: Field[] = columns
      .filter((c) => c.table_name === table.table_name)
      .map((c) => ({
        name: c.column_name,
        type: fieldType(c.data_type),
        nullable: c.is_nullable === "YES",
        ...(c.comment ? { description: c.comment } : {}),
      }))
    const first = fields[0]
    if (!first) continue
    const pk = primaryKeys.filter((k) => k.table_name === table.table_name)
    const relations: Relation[] = foreignKeys
      .filter((k) => k.table_name === table.table_name)
      .map((k) => ({
        field: k.column_name,
        entity: k.foreign_table,
        targetField: k.foreign_column,
      }))
    entities.push({
      name: table.table_name,
      key: pk[0]?.column_name ?? first.name,
      fields,
      relations,
      ...(table.comment ? { description: table.comment } : {}),
    })
  }
  return { entities }
}
