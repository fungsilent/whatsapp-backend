import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const gen = () => {
    bcrypt.genSalt(16, (err, salt) => {
        console.log('salt:', salt)
    })

    console.log('jwt secret:', crypto.randomBytes(64).toString('hex'))
}

gen()
