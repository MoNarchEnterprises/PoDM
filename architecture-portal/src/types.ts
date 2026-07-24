export interface Architecture {
  name: string;
  version: string;
  description: string;
  patterns: string[];
  layers: { name: string; technologies: string[] }[];
  principles: string[];
  documents: Record<string, string>;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  path: string;
  sourceFiles: string[];
  services: string[];
  routes: string[];
  entities: string[];
  dependencies: string[];
  dependents: string[];
  diagrams: string[];
  workflows: string[];
  apis: string[];
  agents: string[];
  events: string[];
  queues: string[];
}

export interface Service {
  id: string;
  name: string;
  module: string;
  description: string;
  methods: string[];
  dependencies: string[];
  events: string[];
}

export interface Entity {
  id: string;
  name: string;
  table: string;
  module: string;
  fields: EntityField[];
  relationships: EntityRelationship[];
}

export interface EntityField {
  name: string;
  type: string;
  description: string;
}

export interface EntityRelationship {
  type: string;
  entity: string;
  description: string;
}

export interface Route {
  id: string;
  method: string;
  path: string;
  module: string;
  auth: string;
  description: string;
}

export interface Page {
  id: string;
  name: string;
  path: string;
  module: string;
  description: string;
}

export interface Component {
  id: string;
  name: string;
  module: string;
  description: string;
  path: string;
}

export interface Workflow {
  id: string;
  name: string;
  module: string;
  description: string;
  steps: string[];
  triggers: string[];
  services: string[];
}

export interface Diagram {
  id: string;
  title: string;
  category: string;
  type: string;
  file: string;
  description: string;
  participants: string[];
  modules: string[];
}

export interface Relationship {
  source: string;
  sourceType: string;
  target: string;
  targetType: string;
  type: string;
  description: string;
}

export interface ExternalSystem {
  id: string;
  name: string;
  description: string;
  url?: string;
  modules: string[];
}

export interface Agent {
  id: string;
  name: string;
  module: string;
  description: string;
  capabilities: string[];
}

export interface Event {
  id: string;
  name: string;
  module: string;
  description: string;
  producers: string[];
  consumers: string[];
}

export interface Queue {
  id: string;
  name: string;
  module: string;
  description: string;
  consumers: string[];
}

export interface KnowledgeGraph {
  architecture: Architecture;
  modules: Module[];
  services: Service[];
  entities: Entity[];
  routes: Route[];
  pages: Page[];
  components: Component[];
  workflows: Workflow[];
  diagrams: Diagram[];
  relationships: Relationship[];
  externalSystems: ExternalSystem[];
  agents: Agent[];
  events: Event[];
  queues: Queue[];
}
