import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import Details from "./pages/Details"; // ✅ Import the Details Page

const App = () => {
  return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/details" element={<Details />} /> {/* ✅ Add this route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
  );
};

export default App;
