import { Navigate, Route, Routes } from "react-router-dom";
import BacklogPage from "./pages/backlog";
import HomePage from "./pages/home";
import SeedPage from "./pages/seed";
import PersonalDashboardPage from "./pages/personalDashboard";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/backlog" element={<BacklogPage />} />
      <Route path="/seed" element={<SeedPage />} />
      <Route path="/personal-dashboard" element={<PersonalDashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
