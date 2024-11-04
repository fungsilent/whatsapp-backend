import jwt from 'jsonwebtoken'
import User from '#root/db/models/User'

const getToken = req => {
    return req.headers.authorization?.split(' ')?.[1] || req.query.token || ''
}

// JWT authorization
export const auth = async (req, res, next) => {
    const token = getToken(req)
    req.auth = false
    req.user = null
    if (token) {
        try {
            // try to find user by token
            const { id } = jwt.verify(token, process.env.JWT_SECRET)
            const user = await User.findById(id)
            if (!user) {
                throw new Error('abort')
            }
            req.auth = true
            req.user = user
        } catch (err) {
            // reject non-authorization in another middleware (requiredAuth)
        }
    }
    next()
}

export const requiredAuth = async (req, res, next) => {
    if (!req.auth) {
        return res.sendFail('authentication denied')
    }
    next()
}

export default {
    auth,
    requiredAuth,
}
