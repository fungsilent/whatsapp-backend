import { requiredAuth } from '#root/middleware/auth'
import testRoute from '#root/api/test'
import userRoute from '#root/api/user'
import friendRoute from '#root/api/friend'
import roomRoute from '#root/api/room'

const apiRoutes = (app, io) => {
    const middleware = {
        requiredAuth,
    }
    userRoute(app, io, middleware)
    friendRoute(app, io, middleware)
    roomRoute(app, io, middleware)
    testRoute(app, io)
}

export default apiRoutes
