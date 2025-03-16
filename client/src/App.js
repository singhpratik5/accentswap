import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import VideoChat from "./VideoChat";
import AdminDashboard from "./admin/adminDashboard";
import Home from "./Home"; // Import the Home component
import Login from "./components/Login";
import Register from "./components/Register";
import Profile from "./components/Profile";
import EnhancedVideoChat from "./components/EnhancedVideoChat";
import Dashboard from "./components/Dashboard";
import TestingMode from "./components/TestingMode";

function App() {
    return (
        <Router>
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/video-chat" element={<EnhancedVideoChat />} />
            <Route path="/basic-video-chat" element={<VideoChat />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/testing" element={<TestingMode />} />
            <Route path="/testing" element={<TestingMode />} />
            </Routes>
        </Router>
    );
}

export default App;
