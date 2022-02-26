const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const {generateMessage} = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')

const app = express()

const server = http.createServer(app)
const io = socketio(server)

const PORT = process.env.PORT || 80
const publicDir = path.join(__dirname, '../public')

app.use(express.static(publicDir))

io.on('connection', (socket) => {
    console.log('New connection!')

    socket.on('join', ({username, room}, cb) => {
        const {error, user} = addUser({id: socket.id, username, room})
        
        if(error) return cb(error)

        socket.join(user.room)
        socket.emit('message', generateMessage('Welcome!'))
        socket.broadcast.to(user.room).emit(
            'message',
            generateMessage(`${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        cb()
    })

    socket.on('message', (message, cb) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('message', generateMessage(user.username, message))
        cb()
    })

    socket.on('location', (location, cb) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('location', generateMessage(
            user.username,
            `https://google.com/maps/?q=${location.latitude},${location.longitude}`))
        cb()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user) io.to(user.room).emit(
            'message',
            generateMessage(`${user.username} has left!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
    })
})

server.listen(PORT, () => {
    console.log(`app listening to port ${PORT}`)
})