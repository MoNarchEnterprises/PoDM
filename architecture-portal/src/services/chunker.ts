import type {
  ArchitectureData, Module, Service, Entity, Route, Page,
  Component, Workflow, Diagram, ExternalSystem, Event, Queue, Agent,
  EmbeddingChunk,
} from '../types';

function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function makeChunk(
  id: string,
  type: EmbeddingChunk['type'],
  title: string,
  text: string,
  source: string,
): EmbeddingChunk {
  return { id, type, title, text, source, hash: hashString(text) };
}

export function chunkArchitecture(arch: ArchitectureData): EmbeddingChunk {
  const text = [
    `# ${arch.name} v${arch.version}`,
    arch.description,
    `Patterns: ${arch.patterns.join(', ')}`,
    `Principles: ${arch.principles.join(', ')}`,
  ].join('\n');
  return makeChunk('architecture-overview', 'architecture', `Architecture: ${arch.name}`, text, '#architecture');
}

export function chunkModule(m: Module): EmbeddingChunk {
  const lines: string[] = [
    `Module: ${m.name}`,
    `Description: ${m.description}`,
    `Path: ${m.path}`,
  ];
  if (m.sourceFiles.length) lines.push(`Source files: ${m.sourceFiles.join(', ')}`);
  if (m.services.length) lines.push(`Services: ${m.services.join(', ')}`);
  if (m.entities.length) lines.push(`Entities: ${m.entities.join(', ')}`);
  if (m.dependencies.length) lines.push(`Dependencies: ${m.dependencies.join(', ')}`);
  if (m.workflows.length) lines.push(`Workflows: ${m.workflows.join(', ')}`);
  if (m.diagrams.length) lines.push(`Diagrams: ${m.diagrams.join(', ')}`);
  return makeChunk(`module-${m.id}`, 'module', `Module: ${m.name}`, lines.join('\n'), m.path);
}

export function chunkService(s: Service): EmbeddingChunk {
  const lines: string[] = [
    `Service: ${s.name}`,
    `Module: ${s.module}`,
    `Description: ${s.description}`,
  ];
  if (s.methods.length) lines.push(`Methods: ${s.methods.join(', ')}`);
  if (s.dependencies.length) lines.push(`Dependencies: ${s.dependencies.join(', ')}`);
  return makeChunk(`service-${s.id}`, 'service', `Service: ${s.name}`, lines.join('\n'), `#service-${s.id}`);
}

export function chunkEntity(e: Entity): EmbeddingChunk {
  const fields = e.fields
    .map((f) => `  - ${f.name} (${f.type}): ${f.description}`)
    .join('\n');
  const rels = e.relationships
    .map((r) => `  - ${r.type} -> ${r.entity}: ${r.description}`)
    .join('\n');
  const lines: string[] = [
    `Entity: ${e.name}`,
    `Table: ${e.table}`,
    `Module: ${e.module}`,
    `Fields:`,
    fields,
  ];
  if (e.relationships.length) {
    lines.push('Relationships:');
    lines.push(rels);
  }
  return makeChunk(`entity-${e.id}`, 'entity', `Entity: ${e.name}`, lines.join('\n'), `#entity-${e.id}`);
}

export function chunkRoute(r: Route): EmbeddingChunk {
  const lines: string[] = [
    `Route: ${r.methods} ${r.path}`,
    `Domain: ${r.domain}`,
    `Module: ${r.module}`,
    `Auth: ${r.auth}`,
    `Roles: ${r.roles.join(', ') || 'public'}`,
    `Controller: ${r.controller}`,
    `Description: ${r.description}`,
  ];
  return makeChunk(`route-${r.id}`, 'route', `Route: ${r.domain}`, lines.join('\n'), r.path);
}

export function chunkPage(p: Page): EmbeddingChunk {
  const lines: string[] = [
    `Page: ${p.name}`,
    `Path: ${p.path}`,
    `Module: ${p.module}`,
    `Components: ${p.components.join(', ')}`,
    `Features: ${p.features.join(', ')}`,
    `Auth: ${p.auth}`,
    `Roles: ${p.roles.join(', ') || 'public'}`,
  ];
  return makeChunk(`page-${p.id}`, 'page', `Page: ${p.name}`, lines.join('\n'), p.path);
}

export function chunkComponent(c: Component): EmbeddingChunk {
  const lines: string[] = [
    `Component: ${c.name}`,
    `Type: ${c.type}`,
    `Module: ${c.module}`,
    `Props: ${c.props.join(', ')}`,
    `Description: ${c.description}`,
  ];
  return makeChunk(`component-${c.id}`, 'component', `Component: ${c.name}`, lines.join('\n'), `#component-${c.id}`);
}

function truncateFlow(steps: string[], max = 12): string {
  const list = steps.slice(0, max);
  let text = list.map((s, i) => `${i + 1}. ${s}`).join('\n');
  if (steps.length > max) text += `\n(... +${steps.length - max} more steps)`;
  return text;
}

export function chunkWorkflow(w: Workflow): EmbeddingChunk {
  const lines: string[] = [
    `Workflow: ${w.name}`,
    `Category: ${w.category}`,
    `Description: ${w.description}`,
    `Actors: ${w.actors.join(', ')}`,
  ];
  if (w.preconditions.length) lines.push(`Preconditions: ${w.preconditions.join('; ')}`);
  if (w.mainFlow.length) {
    lines.push('Main flow:');
    lines.push(truncateFlow(w.mainFlow));
  }
  for (const alt of w.alternativeFlows) {
    lines.push(`Alternative (${alt.condition}):`);
    lines.push(truncateFlow(alt.steps));
  }
  if (w.errorPaths.length) {
    lines.push('Error paths:');
    for (const e of w.errorPaths) {
      lines.push(`- If ${e.condition}: ${e.steps.join(' -> ')}`);
    }
  }
  if (w.tables.length) lines.push(`Tables: ${w.tables.join(', ')}`);
  if (w.modules.length) lines.push(`Modules: ${w.modules.join(', ')}`);
  return makeChunk(`workflow-${w.id}`, 'workflow', `Workflow: ${w.name}`, lines.join('\n'), `#workflow-${w.id}`);
}

export function chunkDiagram(d: Diagram): EmbeddingChunk {
  const lines: string[] = [
    `Diagram: ${d.title}`,
    `Category: ${d.category}`,
    `Type: ${d.type}`,
    `Description: ${d.description}`,
    `Participants: ${d.participants.join(', ')}`,
    `Modules: ${d.modules.join(', ')}`,
    `File: ${d.file}`,
  ];
  return makeChunk(`diagram-${d.id}`, 'diagram', `Diagram: ${d.title}`, lines.join('\n'), `#diagram-${d.id}`);
}

export function chunkExternalSystem(e: ExternalSystem): EmbeddingChunk {
  const lines: string[] = [
    `External system: ${e.name}`,
    `Type: ${e.type}`,
    `Purpose: ${e.purpose}`,
    `Integration: ${e.integration}`,
    `Module: ${e.module}`,
    `Auth: ${e.authMethod}`,
    `Endpoints: ${e.endpoints.join(', ')}`,
  ];
  return makeChunk(`external-${e.id}`, 'externalSystem', `External: ${e.name}`, lines.join('\n'), `#external-${e.id}`);
}

export function chunkEvent(e: Event): EmbeddingChunk {
  const lines: string[] = [
    `Event: ${e.name}`,
    `Type: ${e.type}`,
    `Producer: ${e.producer}`,
    `Consumers: ${e.consumers.join(', ')}`,
    `Payload: ${e.payload}`,
    `Description: ${e.description}`,
  ];
  return makeChunk(`event-${e.id}`, 'event', `Event: ${e.name}`, lines.join('\n'), `#event-${e.id}`);
}

export function chunkQueue(q: Queue): EmbeddingChunk {
  const lines: string[] = [
    `Queue: ${q.name}`,
    `Type: ${q.type}`,
    `Producer: ${q.producer}`,
    `Consumer: ${q.consumer}`,
    `Purpose: ${q.purpose}`,
    `Retry policy: ${q.retryPolicy}`,
  ];
  return makeChunk(`queue-${q.id}`, 'queue', `Queue: ${q.name}`, lines.join('\n'), `#queue-${q.id}`);
}

export function chunkAgent(a: Agent): EmbeddingChunk {
  const lines: string[] = [
    `AI Agent: ${a.name}`,
    `Purpose: ${a.purpose}`,
    `Module: ${a.module}`,
    `Model: ${a.model}`,
    `Capabilities: ${a.capabilities.join(', ')}`,
  ];
  for (const p of a.prompts) {
    lines.push(`- Prompt "${p.name}": ${p.purpose}`);
  }
  return makeChunk(`agent-${a.id}`, 'agent', `Agent: ${a.name}`, lines.join('\n'), `#agent-${a.id}`);
}

const MIN_CHUNK_CHARS = 60;
const MAX_CHUNK_CHARS = 4000;

export function chunkMarkdown(md: string, sourcePath: string): EmbeddingChunk[] {
  const lines = md.split('\n');
  const chunks: EmbeddingChunk[] = [];

  let currentTitle = sourcePath.split('/').pop() || sourcePath;
  let currentH2 = '';
  let currentH3 = '';
  let buffer: string[] = [];
  let chunkIndex = 0;

  const flush = () => {
    const text = buffer.join('\n').trim();
    buffer = [];
    if (text.length < MIN_CHUNK_CHARS) return;

    const sectionLabel = [currentH2, currentH3].filter(Boolean).join(' / ');
    const title = sectionLabel ? `${currentTitle} — ${sectionLabel}` : currentTitle;
    const pageText = text.length > MAX_CHUNK_CHARS
      ? `${text.slice(0, MAX_CHUNK_CHARS)}\n... (truncated)`
      : text;

    const id = `md-${hashString(sourcePath)}-${chunkIndex}`;
    chunkIndex++;
    chunks.push(makeChunk(id, 'markdown', title, pageText, sourcePath));
  };

  for (const rawLine of lines) {
    const line = rawLine;
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      if (buffer.length) flush();
      currentTitle = line.replace(/^#\s+/, '').trim() || currentTitle;
      continue;
    }
    if (line.startsWith('## ')) {
      if (buffer.length) flush();
      currentH2 = line.replace(/^##\s+/, '').trim();
      currentH3 = '';
      continue;
    }
    if (line.startsWith('### ')) {
      if (buffer.length) flush();
      currentH3 = line.replace(/^###\s+/, '').trim();
      continue;
    }
    buffer.push(line);
  }
  if (buffer.length) flush();

  return chunks;
}
