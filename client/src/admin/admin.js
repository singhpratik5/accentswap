document.addEventListener("DOMContentLoaded", () => {
    fetchSessions();
    fetchLogs();
});

function fetchSessions() {
    fetch('/api/admin/sessions', {
        headers: { "x-auth-token": localStorage.getItem("adminToken") }
    })
    .then(res => res.json())
    .then(data => {
        const table = document.getElementById("sessionsTable");
        data.forEach(session => {
            let row = table.insertRow();
            row.insertCell(0).innerText = session.email;
            row.insertCell(1).innerText = session.ip;
            row.insertCell(2).innerText = new Date(session.startTime).toLocaleString();
            let deleteBtn = document.createElement("button");
            deleteBtn.innerText = "End Session";
            deleteBtn.onclick = () => deleteSession(session._id);
            row.insertCell(3).appendChild(deleteBtn);
        });
    });
}

function fetchLogs() {
    fetch('/api/admin/logs', {
        headers: { "x-auth-token": localStorage.getItem("adminToken") }
    })
    .then(res => res.json())
    .then(data => {
        const table = document.getElementById("logsTable");
        data.forEach(log => {
            let row = table.insertRow();
            row.insertCell(0).innerText = log.email;
            row.insertCell(1).innerText = log.ip;
            row.insertCell(2).innerText = new Date(log.loginTime).toLocaleString();
        });
    });
}

function deleteSession(sessionId) {
    fetch(`/api/admin/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { "x-auth-token": localStorage.getItem("adminToken") }
    })
    .then(() => location.reload());
}

function logout() {
    localStorage.removeItem("adminToken");
    window.location.href = "/admin-login.html";
}
