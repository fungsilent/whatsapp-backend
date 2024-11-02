import 'dotenv/config'
import path from 'path'
import express from 'express'
import expressListEndpoints from 'express-list-endpoints'
import colors from 'colors'
import setMiddleware from '#root/middleware'
import apiRoutes from '#root/api/route'
import { connectDatabase } from '#root/db/connect'

/*
 * Start server
 */
startServer()
async function startServer() {
    // config
    const app = express()
    const dirname = import.meta.dirname // same as __dirname
    process.env.appRoot = dirname
    process.env.filesPath = path.join(dirname, '../files')
    console.colorLog = (type, ...rest) => {
        console.log(colors.cyan(`[${type}]`), ...rest)
    }

    await connectDatabase()
    setMiddleware(app)
    setRoutes(app)
    app.listen(process.env.PORT, () => {
        console.colorLog('App', `Server listen on http://localhost:${process.env.PORT}/`)
    })
}

/*
 * Set routes
 */
const setRoutes = app => {
    app.use('/api/file', express.static(process.env.filesPath))

    apiRoutes(app)

    // List all api
    const endpoints = expressListEndpoints(app)
    app.get('/api', (req, res) => {
        const { endpoint } = req.query
        if (endpoint) {
            const findApi = endpoints.find(ep => ep.path === endpoint)
            return res.json({
                api: findApi || null,
            })
        }
        return res.json({
            api: endpoints,
        })
    })

    // Catch 404
    app.use((req, res, next) => {
        res.status(404).sendFail('api not found')
    })
}
