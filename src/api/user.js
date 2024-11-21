import jwt from 'jsonwebtoken'
import argon2 from 'argon2'
import User from '#root/db/models/User'
import { hasValues, docToData } from '#root/utils'

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/

export default (app, io, { requiredAuth }) => {
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

            if (!password.text(passwordRegex)) {
                return res.sendFail('Invalid password')
            }

            const newUser = new User({
                name,
                username: username.toLowerCase(),
                password,
            })
            await newUser.save()

            const token = generateToken({ id: newUser._id })
            res.sendSuccess({ token, ...responseUserInfo(newUser) })
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
            res.sendSuccess({ token, ...responseUserInfo(user) })
        } catch (err) {
            res.sendFail(err.message)
        }
    })

    /*
     * Update user info
     * Method   PATCH
     * Fung Lee
     */
    app.patch('/api/user/update', requiredAuth, async (req, res) => {
        try {
            const self = req.user
            // TODO: icon
            const { name, password } = req.body
            if (name) {
                self.name = name
            }
            if (password && password.text(passwordRegex)) {
                self.password = password
            }
            await self.save()
            res.sendSuccess(responseUserInfo(self))
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
        res.sendSuccess(responseUserInfo(req.user))
    })
}

/*
 * Helper
 */
const generateToken = data => {
    return jwt.sign(data, process.env.JWT_SECRET, { expiresIn: '7d' })
}

const responseUserInfo = user => {
    const data = docToData(user)
    delete data.password
    delete data.createdAt
    return data
}
