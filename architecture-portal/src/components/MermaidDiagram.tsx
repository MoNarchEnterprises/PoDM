import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let renderCounter = 0;

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#6c63ff',
    primaryTextColor: '#e1e2e8',
    primaryBorderColor: '#2a2b36',
    lineColor: '#8b8d9e',
    secondaryColor: '#22232d',
    tertiaryColor: '#1a1b23',
    background: '#1a1b23',
    mainBkg: '#22232d',
    secondBkg: '#1a1b23',
    tertiaryBkg: '#0f1117',
    textColor: '#e1e2e8',
    nodeBorder: '#2a2b36',
    clusterBkg: '#1a1b23',
    clusterBorder: '#2a2b36',
    edgeLabelBackground: '#1a1b23',
    labelTextColor: '#e1e2e8',
  },
  flowchart: { htmlLabels: true, curve: 'linear' },
  sequence: { mirrorActors: true, actorMargin: 60 },
});

export default function MermaidDiagram({ source }: { source: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    renderCounter += 1;
    const id = `mermaid-${renderCounter}`;
    setError(null);

    mermaid
      .render(id, source)
      .then((result: any) => {
        setSvg(result.svg);
      })
      .catch((err: any) => {
        setError(err?.message || 'Failed to render diagram');
      });
  }, [source]);

  if (error) {
    return (
      <div style={{ padding: 16, border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', background: '#1a0a0a', fontSize: 12, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
        <strong>Mermaid syntax error:</strong>{'\n'}{error}
        <pre style={{ marginTop: 8, color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}>{source}</pre>
      </div>
    );
  }

  return <div ref={containerRef} className="mermaid-container" dangerouslySetInnerHTML={{ __html: svg }} style={{ background: 'var(--surface)', borderRadius: 8, padding: 16, overflow: 'auto' }} />;
}
