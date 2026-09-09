import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.js';
import { AnalysisPage } from './routes/AnalysisPage.js';
import { NewSessionPage } from './routes/NewSessionPage.js';
import { ProfilesPage } from './routes/ProfilesPage.js';
import { SessionRunPage } from './routes/SessionRunPage.js';
import { SessionsPage } from './routes/SessionsPage.js';
import { SettingsPage } from './routes/SettingsPage.js';
import { WorkspacesPage } from './routes/WorkspacesPage.js';

export function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/workspaces" replace />} />
          <Route path="/workspaces" element={<WorkspacesPage />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/new" element={<NewSessionPage />} />
          <Route path="/sessions/:id" element={<SessionRunPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
