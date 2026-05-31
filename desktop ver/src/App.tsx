import { useState } from 'react';
import { CrawlerPanel } from './components/CrawlerPanel';
import { WorkspacePanel } from './components/WorkspacePanel';
import { PenpalPanel } from './components/PenpalPanel';

function App() {
  const [showSources, setShowSources] = useState(false);

  return (
    <div className="app-shell">
      {/* 1. Left Column: Virtualized Crawler Panel */}
      <aside className="panel-left">
        <CrawlerPanel 
          onManageSources={() => setShowSources(true)} 
        />
      </aside>

      {/* 2. Center Column: Tabbed Workspace Panel */}
      <main className="panel-center">
        <WorkspacePanel
          showSources={showSources}
          onCloseSources={() => setShowSources(false)}
          onOpenSources={() => setShowSources(true)}
        />
      </main>

      {/* 3. Right Column: Penpals Management Panel */}
      <aside className="panel-right">
        <PenpalPanel />
      </aside>
    </div>
  );
}

export default App;
