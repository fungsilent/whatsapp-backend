import { socketAuth } from '#root/middleware/auth'

const setWebSocket = io => {
    // middleware
    io.use(socketAuth)

    io.on('connection', socket => {
        console.colorLog('WebSocket', `${socket.user.username.green} connected`)
        socket.join(socket.user._id.toString())
    })

    io.event = {
        REFRESH_ROOM_INFO: 'REFRESH_ROOM_INFO',
        NEW_ROOM_MESSAGE: 'NEW_ROOM_MESSAGE',
        REMOVE_ROOM: 'REMOVE_ROOM',
        DISABLE_ROOM: 'DISABLE_ROOM',
        NEW_ROOM: 'NEW_ROOM',
        MEMBER_LEAVE_ROOM: 'MEMBER_LEAVE_ROOM',
        UPDATE_USER_INFO: 'UPDATE_USER_INFO',
    }
}

export default setWebSocket
