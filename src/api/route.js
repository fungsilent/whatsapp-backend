import { requiredAuth } from '#root/middleware/auth'
import testRoute from '#root/api/test'
import userRoute from '#root/api/user'

const apiRoutes = app => {
    const middleware = {
        requiredAuth,
    }
    userRoute(app, middleware)
    testRoute(app)
}

export default apiRoutes
