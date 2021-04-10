const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname,'../public');

app.use(express.static(publicDirectoryPath));

io.on('connection', socket => {
    socket.emit('save client id', socket.id);

    socket.on('message', (message, clientId, roomName) => {
        socket.broadcast.to(roomName).emit('message', message, clientId);
    });

    socket.on('chat message', (roomName, chatMessage) => io.to(roomName).emit('chat message', chatMessage));

    socket.on('create or join', roomName => {
        socket.join(roomName);

        const clientsInRoom = io.sockets.adapter.rooms.get(roomName);
        var numClients = clientsInRoom ? clientsInRoom.size : 0;
        if(numClients === 1){
            socket.emit('isHost');
        } 
        else {
            io.to(roomName).emit('client joined', socket.id);
        }
    });
});


server.listen(port,() => console.log('Listening on port',port));