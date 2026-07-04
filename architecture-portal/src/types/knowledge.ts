export interface ArchitectureData {
  name: string;
  version: string;
  description: string;
  patterns: string[];
  layers: ArchitectureLayer[];
  principles: string[];
  documents: Record<string, string>;
}

export interface ArchitectureLayer {
  name: string;
  technologies: string[];
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
  domain: string;
  path: string;
  methods: string;
  auth: boolean;
  roles: string[];
  module: string;
  controller: string;
  description: string;
}

export interface Page {
  id: string;
  name: string;
  path: string;
  module: string;
  components: string[];
  features: string[];
  auth: boolean;
  roles: string[];
}

export interface Component {
  id: string;
  name: string;
  type: 'ui' | 'layout' | 'feature' | 'shared';
  module: string;
  props: string[];
  description: string;
}

export interface Workflow {
  id: string;
  name: string;
  category: string;
  description: string;
  actors: string[];
  preconditions: string[];
  mainFlow: string[];
  alternativeFlows: WorkflowAlternative[];
  errorPaths: WorkflowErrorPath[];
  retryPaths: string[];
  modules: string[];
  apis: string[];
  tables: string[];
  events: string[];
  agents: string[];
  diagramIds: string[];
}

export interface WorkflowAlternative {
  condition: string;
  steps: string[];
}

export interface WorkflowErrorPath {
  condition: string;
  steps: string[];
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
  type: string;
  purpose: string;
  integration: string;
  module: string;
  endpoints: string[];
  authMethod: string;
}

export interface Event {
  id: string;
  name: string;
  type: string;
  producer: string;
  consumers: string[];
  payload: string;
  description: string;
}

export interface Queue {
  id: string;
  name: string;
  type: string;
  producer: string;
  consumer: string;
  purpose: string;
  retryPolicy: string;
}

export interface Agent {
  id: string;
  name: string;
  purpose: string;
  capabilities: string[];
  module: string;
  model: string;
  prompts: AgentPrompt[];
}

export interface AgentPrompt {
  name: string;
  purpose: string;
}

export interface KnowledgeGraph {
  architecture: ArchitectureData | null;
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
  events: Event[];
  queues: Queue[];
  agents: Agent[];
}
