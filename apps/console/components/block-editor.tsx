"use client"

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Block } from "@hypercube/core/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select as SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  GripVerticalIcon,
  Heading1Icon,
  ListIcon,
  PlusIcon,
  TableIcon,
  TextIcon,
  Trash2Icon,
} from "lucide-react"

export type BlockWithId = Block & { _id: string }

const ADDABLE: { type: Block["type"]; label: string; icon: typeof ListIcon }[] =
  [
    { type: "heading", label: "Heading", icon: Heading1Icon },
    { type: "text", label: "Text", icon: TextIcon },
    { type: "list", label: "List", icon: ListIcon },
    { type: "table", label: "Table", icon: TableIcon },
    { type: "fields", label: "Fields", icon: ListIcon },
  ]

function blank(type: Block["type"], names: string[]): Block {
  const all = names
  switch (type) {
    case "heading":
      return { type: "heading", level: 2, text: "{{view.name}}" }
    case "text":
      return { type: "text", text: "" }
    case "list":
      return { type: "list", ordered: false, item: `{{${all[0] ?? "id"}}}` }
    case "table":
      return { type: "table", fields: all }
    case "fields":
      return { type: "fields", fields: all }
  }
}


function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground w-20 shrink-0 text-sm">{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const current = options.find((o) => o.value === value)
  return (
    <SelectRoot value={value} onValueChange={(v) => onChange(v as string)}>
      <SelectTrigger size="sm" className="w-full">
        <SelectValue>{current?.label ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  )
}

function FieldPicker({
  fields,
  selected,
  onChange,
}: {
  fields: string[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {fields.map((f) => {
        const on = selected.includes(f)
        return (
          <button
            key={f}
            type="button"
            onClick={() =>
              onChange(on ? selected.filter((x) => x !== f) : [...selected, f])
            }
            className={
              on
                ? "bg-primary text-primary-foreground border px-2 py-0.5 text-xs"
                : "border-input text-muted-foreground border px-2 py-0.5 text-xs"
            }
          >
            {f}
          </button>
        )
      })}
    </div>
  )
}

function BlockCard({
  block,
  fieldNames,
  onChange,
  onRemove,
}: {
  block: BlockWithId
  fieldNames: string[]
  onChange: (b: Block) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: block._id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const all = fieldNames

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card flex items-start gap-2 border p-3"
    >
      <button
        type="button"
        className="text-muted-foreground flex h-5 cursor-grab items-center"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <div className="flex flex-1 flex-col gap-2">
        <div className="text-foreground text-sm font-semibold capitalize">
          {block.type}
        </div>
        {block.type === "heading" ? (
          <>
            <Row label="Type">
              <Select
                value={String(block.level)}
                options={[
                  { value: "1", label: "H1" },
                  { value: "2", label: "H2" },
                  { value: "3", label: "H3" },
                ]}
                onChange={(v) =>
                  onChange({ ...block, level: Number(v) as 1 | 2 | 3 })
                }
              />
            </Row>
            <Row label="Text">
              <Input
                value={block.text}
                onChange={(e) => onChange({ ...block, text: e.target.value })}
                placeholder="{{view.name}}"
              />
            </Row>
          </>
        ) : null}
        {block.type === "text" ? (
          <Row label="Text">
            <Input
              value={block.text}
              onChange={(e) => onChange({ ...block, text: e.target.value })}
              placeholder="Any text, {{count}} records…"
            />
          </Row>
        ) : null}
        {block.type === "list" ? (
          <>
            <Row label="Type">
              <Select
                value={block.ordered ? "ordered" : "bulleted"}
                options={[
                  { value: "bulleted", label: "Bulleted" },
                  { value: "ordered", label: "Numbered" },
                ]}
                onChange={(v) =>
                  onChange({ ...block, ordered: v === "ordered" })
                }
              />
            </Row>
            <Row label="Each item">
              <Input
                value={block.item}
                onChange={(e) => onChange({ ...block, item: e.target.value })}
                placeholder="{{title}} — {{views}}"
              />
            </Row>
            <p className="text-muted-foreground text-xs">
              Per record. Fields:{" "}
              {all.map((f) => (
                <code key={f} className="bg-muted mr-1 px-1">
                  {`{{${f}}}`}
                </code>
              ))}
            </p>
          </>
        ) : null}
        {block.type === "table" || block.type === "fields" ? (
          <Row label="Fields">
            <FieldPicker
              fields={all}
              selected={block.fields}
              onChange={(next) => onChange({ ...block, fields: next })}
            />
          </Row>
        ) : null}
      </div>
      <Button size="icon-sm" variant="ghost" onClick={onRemove}>
        <Trash2Icon />
      </Button>
    </div>
  )
}

export function BlockEditor({
  blocks,
  fieldNames,
  onChange,
}: {
  blocks: BlockWithId[]
  fieldNames: string[]
  onChange: (blocks: BlockWithId[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const from = blocks.findIndex((b) => b._id === active.id)
      const to = blocks.findIndex((b) => b._id === over.id)
      onChange(arrayMove(blocks, from, to))
    }
  }

  let counter = 0
  function add(type: Block["type"]) {
    const b = blank(type, fieldNames) as BlockWithId
    b._id = `b${Date.now()}${counter++}`
    onChange([...blocks, b])
  }

  return (
    <div className="flex flex-col gap-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={blocks.map((b) => b._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {blocks.map((block, i) => (
              <BlockCard
                key={block._id}
                block={block}
                fieldNames={fieldNames}
                onChange={(b) =>
                  onChange(
                    blocks.map((x, j) =>
                      j === i ? ({ ...b, _id: block._id } as BlockWithId) : x,
                    ),
                  )
                }
                onRemove={() => onChange(blocks.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="sm" variant="outline">
              <PlusIcon />
              Add block
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          {ADDABLE.map((a) => (
            <DropdownMenuItem key={a.type} onClick={() => add(a.type)}>
              <a.icon />
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
