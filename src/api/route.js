import { requiredAuth } from '#root/middleware/auth'
import testRoute from '#root/api/test'
import userRoute from '#root/api/user'
import friendRoute from '#root/api/friend'

const apiRoutes = app => {
    const middleware = {
        requiredAuth,
    }
    userRoute(app, middleware)
    friendRoute(app, middleware)
    testRoute(app)
}

export default apiRoutes
