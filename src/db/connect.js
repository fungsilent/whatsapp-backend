import mongoose from 'mongoose'

export const connectDatabase = async () => {
    try {
        console.colorLog('Database', 'Connecting...'.yellow)
        await mongoose.connect(process.env.DATABASE_URI, {
            dbName: 'whatsapp',
        })
        console.colorLog('Database', 'Successful connected'.green)
    } catch (err) {
        console.colorLog('Database', 'Failed connected'.red)
        console.log(err.message)
        process.exit(1)
    }
}
