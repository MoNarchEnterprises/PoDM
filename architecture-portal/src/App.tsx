import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSettings } from './hooks/useSettings';
import AppLayout from './components/Layout/AppLayout';
import { searchService } from './services/searchService';

import Dashboard from './pages/Dashboard/Dashboard';
import Modules from './pages/Modules/Modules';
import ModuleDetail from './pages/Modules/ModuleDetail';
import Workflows from './pages/Workflows/Workflows';
import WorkflowDetail from './pages/Workflows/WorkflowDetail';
import Diagrams from './pages/Diagrams/Diagrams';
import DiagramViewer from './pages/Diagrams/DiagramViewer';
import AiAssistant from './pages/AiAssistant/AiAssistant';
import Settings from './pages/Settings/Settings';
import ModuleTree from './pages/ModuleTree/ModuleTree';
import Services from './pages/Services/Services';
import Api from './pages/Api/Api';
import Database from './pages/Database/Database';
import Entities from './pages/Entities/Entities';
import NotFound from './pages/NotFound/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function AppContent() {
  const { muiTheme } = useSettings();

  useEffect(() => {
    searchService.initialize();
  }, []);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/modules" element={<Modules />} />
            <Route path="/modules/:id" element={<ModuleDetail />} />
            <Route path="/workflows" element={<Workflows />} />
            <Route path="/workflows/:id" element={<WorkflowDetail />} />
            <Route path="/diagrams" element={<Diagrams />} />
            <Route path="/diagrams/:id" element={<DiagramViewer />} />
            <Route path="/ai" element={<AiAssistant />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/module-tree" element={<ModuleTree />} />
            <Route path="/services" element={<Services />} />
            <Route path="/api" element={<Api />} />
            <Route path="/database" element={<Database />} />
            <Route path="/entities" element={<Entities />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
