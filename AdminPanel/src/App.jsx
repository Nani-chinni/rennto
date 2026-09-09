import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Owners from "./pages/Owners";
import Properties from "./pages/Properties";
import Bookings from "./pages/Bookings";
import Payments from "./pages/Payments";
import Complaints from "./pages/Complaints";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import { NotificationProvider } from "./context/NotificationContext";

import "./App.css";

const AuthenticatedLayout = () => (
    <NotificationProvider>
        <Outlet />
    </NotificationProvider>
);

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(
        !!(localStorage.getItem("adminToken") || localStorage.getItem("token"))
    );

    const handleLogin = () => {
        setIsAuthenticated(true);
    };

    return (
        <Router>
            <Routes>
                {/* Public Route */}
                <Route
                    path="/login"
                    element={
                        !isAuthenticated ? (
                            <Login onLogin={handleLogin} />
                        ) : (
                            <Navigate to="/" />
                        )
                    }
                />

                {/* Protected Routes */}
                <Route element={isAuthenticated ? <AuthenticatedLayout /> : <Navigate to="/login" />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/owners" element={<Owners />} />
                    <Route path="/properties" element={<Properties />} />
                    <Route path="/bookings" element={<Bookings />} />
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/complaints" element={<Complaints />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Settings />} />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;
