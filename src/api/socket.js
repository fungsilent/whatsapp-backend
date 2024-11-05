import { socketAuth } from '#root/middleware/auth'

const setWebSocket = io => {
    // middleware
    io.use(socketAuth)

    io.on('connection', socket => {
        console.colorLog('WebSocket', `${socket.user.name.green} connected`)
    })
}

export default setWebSocket
