import React from "react";
import {
 BrowserRouter as Router,
 Routes,
 Route
} from "react-router-dom";
import Datasets from './datasets';
import Home from './Home';
import Configs from './Config';
import Logs from './Logs';
import Models from './Models';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/datasets" element={<Datasets />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/config" element={<Configs />} />
        <Route path="/models" element={<Models />} />
      </Routes>
    </Router>
  );
}
export default App;
