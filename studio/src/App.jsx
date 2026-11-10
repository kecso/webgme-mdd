import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Welcome from './pages/Welcome.jsx';
import Projects from './pages/Projects.jsx';
import ProjectStudio from './pages/ProjectStudio.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/p/:owner/:name" element={<ProjectStudio />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
