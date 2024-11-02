import { requiredAuth } from '#root/middleware/auth'
import userRoute from '#root/api/user'

const apiRoutes = app => {
    const middleware = {
        requiredAuth,
    }
    userRoute(app, middleware)
}

export default apiRoutes
