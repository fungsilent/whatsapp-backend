import { socketAuth } from '#root/middleware/auth'

const setWebSocket = io => {
    // middleware
    io.use(socketAuth)

    io.on('connection', socket => {
        console.colorLog('WebSocket', `${socket.user.name.green} connected`)
        socket.join(socket.user._id.toString())
    })
}

export default setWebSocket
