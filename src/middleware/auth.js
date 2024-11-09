import jwt from 'jsonwebtoken'
import User from '#root/db/models/User'

const findUserByToken = async token => {
    if (token) {
        try {
            const { id } = jwt.verify(token, process.env.JWT_SECRET)
            const user = await User.findById(id)
            if (!user) {
                throw new Error('abort')
            }
            return user
        } catch (err) {}
    }
    return null
}

/*
 * Express
 */
export const expressAuth = async (req, res, next) => {
    // try to find user by token
    const token = req.headers.authorization?.split(' ')?.[1] || req.query?.token || ''
    const user = await findUserByToken(token)
    req.auth = !!user
    req.user = user
    // reject non-authorization in another middleware (requiredAuth)
    next()
}

export const requiredAuth = async (req, res, next) => {
    if (!req.auth) {
        return res.sendFail('authentication denied')
    }
    next()
}

/*
 * Socket.io
 */
export const socketAuth = async (socket, next) => {
    const user = await findUserByToken(socket.handshake?.query?.token)
    if (!user) {
        return socket.disconnect()
    }
    socket.user = user
    next()
}
