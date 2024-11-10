import { requiredAuth } from '#root/middleware/auth'
import testRoute from '#root/api/test'
import userRoute from '#root/api/user'
import friendRoute from '#root/api/friend'
import roomRoute from '#root/api/room'

const apiRoutes = app => {
    const middleware = {
        requiredAuth,
    }
    userRoute(app, middleware)
    friendRoute(app, middleware)
    roomRoute(app, middleware)
    testRoute(app)
}

export default apiRoutes
