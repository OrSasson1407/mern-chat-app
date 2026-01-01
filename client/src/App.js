import "./App.css";
import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Chatpage from "./pages/Chatpage";

function App() {
  return (
    <div className="App">
      <Routes>
        {/* Route for Login and Signup */}
        <Route path="/" element={<HomePage />} />
        {/* Route for the main Chat interface */}
        <Route path="/chats" element={<Chatpage />} />
      </Routes>
    </div>
  );
}

export default App;