import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Projects from './pages/Projects.jsx';
import ProjectStudio from './pages/ProjectStudio.jsx';
import BookPreview from './pages/BookPreview.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Projects />} />
      <Route path="/projects" element={<Navigate to="/" replace />} />
      <Route path="/p/:owner/:name" element={<ProjectStudio />} />
      <Route path="/p/:owner/:name/book" element={<BookPreview />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
