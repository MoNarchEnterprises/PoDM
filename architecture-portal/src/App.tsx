import { Routes, Route, NavLink } from 'react-router-dom';
import type { KnowledgeGraph } from './types';
import { loadKnowledgeGraph } from './data/loader';
import Dashboard from './pages/Dashboard';
import Modules from './pages/Modules';
import Entities from './pages/Entities';
import Services from './pages/Services';
import Diagrams from './pages/Diagrams';
import Graph from './pages/Graph';
import Search from './pages/Search';
import Wallets from './pages/Wallets';

const data: KnowledgeGraph = loadKnowledgeGraph();

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>PoDM Architecture</h1>
          <p>v{data.architecture.version}</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
            <span>📊</span> Dashboard
          </NavLink>
          <NavLink to="/wallets" className={({ isActive }) => isActive ? 'active' : ''}>
            <span>🌐</span> Wallets & Blockchain
          </NavLink>
          <NavLink to="/modules" className={({ isActive }) => isActive ? 'active' : ''}>
            <span>🧩</span> Modules
          </NavLink>
          <NavLink to="/services" className={({ isActive }) => isActive ? 'active' : ''}>
            <span>⚙️</span> Services
          </NavLink>
          <NavLink to="/entities" className={({ isActive }) => isActive ? 'active' : ''}>
            <span>🗄️</span> Entities
          </NavLink>
          <NavLink to="/diagrams" className={({ isActive }) => isActive ? 'active' : ''}>
            <span>📈</span> Diagrams
          </NavLink>
          <NavLink to="/graph" className={({ isActive }) => isActive ? 'active' : ''}>
            <span>🔗</span> Knowledge Graph
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => isActive ? 'active' : ''}>
            <span>🔍</span> Search
          </NavLink>
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard data={data} />} />
          <Route path="/wallets" element={<Wallets data={data} />} />
          <Route path="/modules" element={<Modules data={data} />} />
          <Route path="/services" element={<Services data={data} />} />
          <Route path="/entities" element={<Entities data={data} />} />
          <Route path="/diagrams" element={<Diagrams data={data} />} />
          <Route path="/graph" element={<Graph data={data} />} />
          <Route path="/search" element={<Search data={data} />} />
        </Routes>
      </main>
    </div>
  );
}
