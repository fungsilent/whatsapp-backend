import jwt from 'jsonwebtoken'
import argon2 from 'argon2'
import User from '#root/db/models/User'
import { hasValues, docToData } from '#root/utils'

export default (app, { requiredAuth }) => {
    /*
     * User sign up account
     * Method   POST
     * Fung Lee
     */
    app.post('/api/user/add', async (req, res) => {
        const { name, username, password } = req.body
        try {
            const isMissing = !hasValues(req.body, ['name', 'username', 'password'])
            if (isMissing) {
                return res.sendFail('Missing fields')
            }

            const user = await User.findOne({ username })
            if (user) {
                return res.sendFail('Username has been used')
            }
            const newUser = new User({ name, username, password })
            await newUser.save()

            const token = generateToken({ id: newUser._id })
            res.sendSuccess({ token })
        } catch (err) {
            console.log(err)
            res.sendFail('Sign up user failed')
        }
    })

    /*
     * User sign in account
     * Method   POST
     * Fung Lee
     */
    app.post('/api/user/login', async (req, res) => {
        const { username, password } = req.body
        try {
            const user = await User.findOne({ username })
            if (!user) {
                return res.sendFail('Username not found')
            }
            const isMatch = await argon2.verify(user.password, password)
            if (!isMatch) {
                return res.sendFail('Password incorrect')
            }
            const token = generateToken({ id: user._id })
            const data = docToData(user)
            delete data.password
            res.sendSuccess({ token, ...data })
        } catch (err) {
            res.sendFail(err.message)
        }
    })

    app.post('app/user/update', async (req, res) => {
        const { username, name, password, newPassword } = req.body
        try {
            const user = await User.findOne({ username })
            res.sendSuccess(user)
        } catch (err) {
            res.sendFail(err.message)
        }
    })

    /*
     * Get info of user
     * Method   GET
     * Fung Lee
     */
    app.get('/api/user/info', requiredAuth, async (req, res) => {
        const user = req.user.toObject()
        const data = docToData(user)
        delete data.password
        res.sendSuccess(data)
    })
}

/*
 * Helper
 */
const generateToken = data => {
    return jwt.sign(data, process.env.JWT_SECRET, { expiresIn: '7d' })
}
