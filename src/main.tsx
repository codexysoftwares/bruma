import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './styles.css';
import Landing from './lp/Landing';
import Login from './app/Login';
import { RequireAuth } from './app/Shell';

const Dashboard = lazy(() => import('./app/Dashboard'));
const NewProject = lazy(() => import('./app/NewProject'));
const ProjectPage = lazy(() => import('./app/ProjectPage'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/app" element={<RequireAuth />}>
            <Route index element={<Dashboard />} />
            <Route path="novo" element={<NewProject />} />
            <Route path="p/:id" element={<ProjectPage />} />
          </Route>
          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
