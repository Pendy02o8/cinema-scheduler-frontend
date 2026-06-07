import { BrowserRouter, Routes, Route } from "react-router-dom";
import EmployeePage from "./pages/EmployeePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EmployeePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;