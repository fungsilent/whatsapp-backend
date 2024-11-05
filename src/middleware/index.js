import bodyParser from 'body-parser'
import logger from 'morgan'
import cors from 'cors'
import { expressAuth } from '#root/middleware/auth'

const setMiddleware = app => {
    // Basic middleware
    app.use(logger('dev'))
    app.use(cors())
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: false }))

    // JWT authorization
    app.use(expressAuth)

    app.use((req, res, next) => {
        res.sendSuccess = data => {
            res.json({
                ok: true,
                data,
            })
        }
        res.sendFail = message => {
            res.json({
                ok: false,
                error: message,
            })
        }
        next()
    })
}
export default setMiddleware
