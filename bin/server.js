const ws =  require("ws")
const express = require("express")
const fs = require("fs");
const path = require("path");
const { SocketAddress } = require("net");

const PORT = process.env.PORT || 25569

const server = new ws.Server({ port: PORT });

let sockets = new Map();
let rooms = {};

function send_room(id, msg) {

    var room = rooms[id];

    if(room == undefined)
        return;

    room.forEach(room_socket => {
        room_socket.send(msg);
    });

}

server.on("connection", socket => {
    sockets.set(socket, {'room': 0, 'messages': 0});
    console.log("Client connected!");

    socket.on('message', function(msg) {

        msg = msg.toString();

        var socket_data = sockets.get(socket);

        if(socket_data.messages == 0){
            socket_data.room = msg;
            console.log("Socket connected to room " + msg);

            if(!(socket_data.room in rooms)){
                console.log("Creating room '" + socket_data.room + "'");
                rooms[socket_data.room] =  [];
            }

            var room = rooms[socket_data.room];

            
            room.push(socket);

            send_room(socket_data.room, "_g_A new client has connected!");

        } else {

            if(msg.startsWith("_g_")){
                socket.send("_g_Global messages are for servers only. Disconnecting...")
                socket.close()
                return;
            }

            send_room(socket_data.room, msg);
        }



        socket_data.messages++;
    });

    socket.on('close', function() {
        console.log("Client disconnected!");

        var socket_data = sockets.get(socket);
        send_room(socket_data.room, "_g_A client has disconnected!");

        sockets.delete(socket);
    });
});

console.log(`listening chat on PORT ${PORT}`)

var website = express();

website.get('/', function (req, res) {
    
    const abs = path.join(__dirname, "www/app.html")

    res.send(fs.readFileSync(abs, "utf-8"));
})

website.get("/*", (req, res) => {
    const abs = path.join(__dirname, "www/", req.path);

    if(!fs.existsSync(abs)){
        res.status(404);
        res.send("Could not find resource");
    } else {
        res.send(fs.readFileSync(abs, "utf-8"));
    }
});

var website_srv = website.listen('8080', '0.0.0.0', () => {
    var host = website_srv.address().address
    var port = website_srv.address().port
    
    console.log("Website listening at http://%s:%s", host, port)
 })