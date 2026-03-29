import { Navigate, Route, Routes } from "react-router-dom";
import BacklogPage from "./pages/backlog";
import HomePage from "./pages/home";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/backlog" element={<BacklogPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
