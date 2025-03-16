const { Server } = require("socket.io");

let ioInstance;

const initVideoSocket = (server) => {
    ioInstance = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    ioInstance.on("connection", (socket) => {
        console.log("New user connected:", socket.id);

        socket.on("join-room", ({ roomId, userId }) => {
            socket.join(roomId);
            socket.to(roomId).emit("user-connected", userId);

            socket.on("disconnect", () => {
                socket.to(roomId).emit("user-disconnected", userId);
            });
        });
    });
};

module.exports = { initVideoSocket };
