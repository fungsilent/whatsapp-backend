import 'dotenv/config'
import path from 'path'
import express from 'express'
import expressListEndpoints from 'express-list-endpoints'
import { Server } from 'socket.io'
import colors from 'colors'
import setMiddleware from '#root/middleware'
import apiRoutes from '#root/api/route'
import setWebSocket from '#root/api/socket'
import { connectDatabase } from '#root/db/connect'

/*
 * Start server
 */
startServer()
async function startServer() {
    // Config
    const dirname = import.meta.dirname // same as __dirname
    process.env.appRoot = dirname
    process.env.filesPath = path.join(dirname, '../files')
    console.colorLog = (type, ...rest) => {
        console.log(colors.cyan(`[${type}]`), ...rest)
    }

    // Set up server
    await connectDatabase()
    const app = express()
    setMiddleware(app)
    setRoutes(app)
    const server = app.listen(process.env.PORT, () => {
        console.colorLog('App', `Server listen on http://localhost:${process.env.PORT}/`)
    })

    const io = new Server(server, {
        path: '/ws/',
        transports: ['websocket'],
    })
    setWebSocket(io)
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
            const findApi = endpoints.filter(ep => ep.path.startsWith(endpoint))
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
