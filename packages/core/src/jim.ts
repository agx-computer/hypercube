export interface JimSegment {
  kind: "text" | "expr"
  value: string
  offset: number
}

export interface JimDoc {
  frontmatter: string
  body: string
  bodyLine: number
}

export function splitJim(source: string): JimDoc {
  const lines = source.split("\n")
  if (lines[0]?.trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        return {
          frontmatter: lines.slice(1, i).join("\n"),
          body: lines.slice(i + 1).join("\n"),
          bodyLine: i + 2,
        }
      }
    }
  }
  return { frontmatter: "", body: source, bodyLine: 1 }
}

export function joinJim(frontmatter: string, body: string): string {
  const block = frontmatter.replace(/\s+$/, "")
  if (!block.trim()) return body
  return `---\n${block}\n---\n${body}`
}

export class JimSyntaxError extends Error {
  line: number
  constructor(message: string, line: number) {
    super(`line ${line}: ${message}`)
    this.line = line
  }
}

export function lineOf(source: string, offset: number): number {
  let line = 1
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === "\n") line += 1
  }
  return line
}

function skipString(source: string, start: number, quote: string): number {
  let i = start + 1
  while (i < source.length) {
    const ch = source[i]
    if (ch === "\\") {
      i += 2
      continue
    }
    if (ch === quote) return i + 1
    i += 1
  }
  return -1
}

function skipTemplate(source: string, start: number): number {
  let i = start + 1
  while (i < source.length) {
    const ch = source[i]
    if (ch === "\\") {
      i += 2
      continue
    }
    if (ch === "`") return i + 1
    if (ch === "$" && source[i + 1] === "{") {
      const end = skipBraces(source, i + 1)
      if (end === -1) return -1
      i = end
      continue
    }
    i += 1
  }
  return -1
}

function skipBraces(source: string, start: number): number {
  let depth = 0
  let i = start
  while (i < source.length) {
    const ch = source[i]
    if (ch === '"' || ch === "'") {
      const end = skipString(source, i, ch)
      if (end === -1) return -1
      i = end
      continue
    }
    if (ch === "`") {
      const end = skipTemplate(source, i)
      if (end === -1) return -1
      i = end
      continue
    }
    if (ch === "{") {
      depth += 1
      i += 1
      continue
    }
    if (ch === "}") {
      depth -= 1
      i += 1
      if (depth === 0) return i
      continue
    }
    i += 1
  }
  return -1
}

export function findExpressionEnd(source: string, start: number): number {
  let depth = 0
  let i = start
  while (i < source.length) {
    const ch = source[i]
    if (ch === '"' || ch === "'") {
      const end = skipString(source, i, ch)
      if (end === -1) return -1
      i = end
      continue
    }
    if (ch === "`") {
      const end = skipTemplate(source, i)
      if (end === -1) return -1
      i = end
      continue
    }
    if (ch === "{") {
      depth += 1
      i += 1
      continue
    }
    if (ch === "}") {
      if (depth === 0) {
        if (source[i + 1] === "}") return i
        return -1
      }
      depth -= 1
      i += 1
      continue
    }
    i += 1
  }
  return -1
}

export function parseJim(source: string): JimSegment[] {
  const segments: JimSegment[] = []
  let text = ""
  let textOffset = 0
  let i = 0
  const flush = () => {
    if (text) {
      segments.push({ kind: "text", value: text, offset: textOffset })
      text = ""
    }
  }
  while (i < source.length) {
    if (source.startsWith("\\{{", i)) {
      text += "{{"
      i += 3
      continue
    }
    if (source.startsWith("{{", i)) {
      const start = i + 2
      const end = findExpressionEnd(source, start)
      if (end === -1) {
        throw new JimSyntaxError("unclosed {{ expression", lineOf(source, i))
      }
      flush()
      segments.push({
        kind: "expr",
        value: source.slice(start, end),
        offset: i,
      })
      i = end + 2
      textOffset = i
      continue
    }
    if (!text) textOffset = i
    text += source[i]
    i += 1
  }
  flush()
  return segments
}

interface DeclStart {
  index: number
  name: string
  exprStart: number | null
}

function scanDecls(code: string): DeclStart[] {
  const found: DeclStart[] = []
  let depth = 0
  let atStart = true
  let i = 0
  while (i < code.length) {
    const ch = code[i]
    if (ch === "/" && code[i + 1] === "/") {
      const nl = code.indexOf("\n", i)
      i = nl === -1 ? code.length : nl
      continue
    }
    if (ch === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2)
      i = end === -1 ? code.length : end + 2
      continue
    }
    if (ch === '"' || ch === "'") {
      const end = skipString(code, i, ch)
      if (end === -1) break
      i = end
      atStart = false
      continue
    }
    if (ch === "`") {
      const end = skipTemplate(code, i)
      if (end === -1) break
      i = end
      atStart = false
      continue
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1
      i += 1
      atStart = false
      continue
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1
      i += 1
      atStart = false
      continue
    }
    if (ch === "\n" || ch === ";") {
      i += 1
      atStart = true
      continue
    }
    if (ch === " " || ch === "\t" || ch === "\r") {
      i += 1
      continue
    }
    if (depth === 0 && atStart) {
      const match = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)(\s*=\s*)?/.exec(
        code.slice(i),
      )
      if (match) {
        found.push({
          index: i,
          name: match[1],
          exprStart: match[2] ? i + match[0].length : null,
        })
        i += match[0].length
        atStart = false
        continue
      }
    }
    atStart = false
    i += 1
  }
  return found
}

export function topLevelDecls(code: string): string[] {
  return [...new Set(scanDecls(code).map((d) => d.name))]
}

export interface JimDeclaration {
  name: string
  code: string
}

export function parseFrontmatter(code: string): {
  preamble: string
  declarations: JimDeclaration[]
} {
  const starts = scanDecls(code)
  if (starts.length === 0) {
    return {
      preamble: code.trim() ? code.replace(/\s+$/, "") : "",
      declarations: [],
    }
  }
  const preambleParts: string[] = []
  const head = code.slice(0, starts[0].index)
  if (head.trim()) preambleParts.push(head.replace(/\s+$/, ""))
  const declarations: JimDeclaration[] = []
  starts.forEach((start, k) => {
    const end = starts[k + 1]?.index ?? code.length
    if (start.exprStart == null) {
      const chunk = code.slice(start.index, end)
      if (chunk.trim()) preambleParts.push(chunk.replace(/\s+$/, ""))
      return
    }
    const expr = code.slice(start.exprStart, end).replace(/[\s;]+$/, "")
    declarations.push({ name: start.name, code: expr })
  })
  return { preamble: preambleParts.join("\n"), declarations }
}

export function buildFrontmatter(
  preamble: string,
  declarations: JimDeclaration[],
): string {
  const parts: string[] = []
  if (preamble.trim()) parts.push(preamble.replace(/\s+$/, ""))
  for (const declaration of declarations) {
    const name = declaration.name.trim()
    const code = declaration.code.trim()
    if (!name && !code) continue
    parts.push(`const ${name} = ${code}`)
  }
  return parts.join("\n")
}
