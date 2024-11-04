import { auth } from '#root/middleware/auth'

const setWebSocket = io => {
    // middleware
    io.engine.use(async (req, res, next) => {
        const firstConnection = req._query.sid === undefined
        if (!firstConnection) {
            return next()
        }
        auth(req, res, next)
    })

    io.on('connection', socket => {
        console.log('a user connected', socket.request.user)
    })
}

export default setWebSocket
