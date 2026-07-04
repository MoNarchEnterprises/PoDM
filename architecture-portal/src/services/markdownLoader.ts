export interface DocFile {
  path: string;
  name: string;
  content: string;
  loaded: boolean;
}

class MarkdownLoaderService {
  private cache = new Map<string, string>();

  async loadFile(relativePath: string): Promise<string> {
    if (this.cache.has(relativePath)) {
      return this.cache.get(relativePath)!;
    }

    const base = import.meta.env.BASE_URL || '/';
    const url = `${base}${relativePath}`;

    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to load ${relativePath}: ${resp.status}`);
      const text = await resp.text();
      this.cache.set(relativePath, text);
      return text;
    } catch (err) {
      console.warn(`Failed to load markdown: ${relativePath}`, err);
      return `# Content Not Available\n\nUnable to load \`${relativePath}\`.`;
    }
  }

  async loadArchitectureDoc(name: string): Promise<string> {
    return this.loadFile(`docs/architecture/${name}`);
  }

  async loadFlowchart(name: string): Promise<string> {
    return this.loadFile(`docs/flowcharts/${name}`);
  }

  async loadApiDoc(): Promise<string> {
    return this.loadFile('docs/api/README.md');
  }

  async loadKnowledgeJson(name: string): Promise<any> {
    try {
      const text = await this.loadFile(`docs/knowledge/${name}`);
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async loadDiagramSpec(id: string): Promise<any> {
    const padded = id.padStart(3, '0');
    try {
      const text = await this.loadFile(`docs/diagram-specifications/${padded}.json`);
      return JSON.parse(text);
    } catch {
      try {
        const text = await this.loadFile(`docs/diagram-specifications/${id}.json`);
        return JSON.parse(text);
      } catch {
        return null;
      }
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const markdownLoader = new MarkdownLoaderService();
