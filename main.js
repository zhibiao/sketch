const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.static("public"));
const httpServer = createServer(app);
const io = new Server(httpServer, {});

io.on("connection", (socket) => {
  socket.on("canvas:update", (...args) => {
    socket.broadcast.emit("canvas:update", ...args);
  });

  socket.on("canvas:erased", (...args) => {
    socket.broadcast.emit("canvas:erased", ...args);
  });

  socket.on("canvas:clear", (...args) => {
    socket.broadcast.emit("canvas:clear", ...args);
  });
});

httpServer.listen(8080);
