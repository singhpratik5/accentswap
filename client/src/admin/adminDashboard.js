import React, { useState, useEffect } from 'react';

const AdminDashboard = () => {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        fetch('http://localhost:5000/api/admin/logs')
            .then(response => response.json())
            .then(data => setLogs(data));
    }, []);

    return (
        <div>
            <h2>Admin Dashboard</h2>
            <ul>
                {logs.map((log, index) => (
                    <li key={index}>{log.email} - {log.ip}</li>
                ))}
            </ul>
        </div>
    );
};

export default AdminDashboard;
