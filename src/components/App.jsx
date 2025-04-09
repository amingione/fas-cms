import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Garage from './Garage';
import GarageDashboard from './GarageDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/garage-login" element={<Garage />} /> {/* ⬅ moved from "/" */}
        <Route path="/garage-dashboard" element={<GarageDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;