import crypto from 'crypto'

const gen = () => {
    console.log('jwt secret:', crypto.randomBytes(64).toString('hex'))
}

gen()
