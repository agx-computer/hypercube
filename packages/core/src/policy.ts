import type { SchemaModel } from "./model"
import type { Entity } from "./model"

export interface EntityPolicy {
  label?: string
  description?: string
  fields?: string[]
  pageSize?: number
}

export interface Policy {
  name: string
  description: string
  origin: string
  expose: Record<string, EntityPolicy | true>
}

export interface SiteEntity extends Entity {
  slug: string
  label: string
  pageSize: number
}

export interface SiteModel {
  name: string
  description: string
  origin: string
  entities: SiteEntity[]
}

export function resolveSite(model: SchemaModel, policy: Policy): SiteModel {
  const entities: SiteEntity[] = []
  for (const [name, rule] of Object.entries(policy.expose)) {
    const entity = model.entities.find((e) => e.name === name)
    if (!entity) continue
    const opts = rule === true ? {} : rule
    const allowed = opts.fields
    const fields = allowed
      ? entity.fields.filter((f) => allowed.includes(f.name) || f.name === entity.key)
      : entity.fields
    entities.push({
      ...entity,
      fields,
      slug: name,
      label: opts.label ?? name,
      description: opts.description ?? entity.description,
      pageSize: opts.pageSize ?? 25,
    })
  }
  return {
    name: policy.name,
    description: policy.description,
    origin: policy.origin,
    entities,
  }
}
