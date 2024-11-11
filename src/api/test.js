import User from '#root/db/models/User'
import Room from '#root/db/models/Room'
import Message from '#root/db/models/Message'
import Perspective from '#root/db/models/Perspective'
import { hasValues, docToData } from '#root/utils'

export default app => {
    app.get('/api/insert', async (req, res) => {
        try {
            const fung = await User.findOne({ username: 'fung' })
            const terry = await User.findOne({ username: 'terry' })
            const reze = await User.findOne({ username: 'Reze' })
            const { type, roomId } = req.query
            console.log('type', type)
            switch (type) {
                case 'group-message': {
                    const room = await Room.findById(roomId)
                    await new Message({
                        user: terry,
                        room,
                        type: 'text',
                        content: '遲10分鐘',
                    }).save()
                    await new Message({
                        user: fung,
                        room,
                        type: 'text',
                        content: '+1',
                    }).save()
                    const lastMessage = await new Message({
                        user: reze,
                        room,
                        type: 'text',
                        content: 'two',
                    }).save()
                    room.lastMessage = lastMessage
                    await room.save()
                    break
                }
                case 'friend-message': {
                    const room = await Room.findById(roomId)
                    await new Message({
                        user: fung,
                        room,
                        type: 'text',
                        content: '9點開會',
                    }).save()
                    const lastMessage = await new Message({
                        user: terry,
                        room,
                        type: 'text',
                        content: 'ok',
                    }).save()
                    room.lastMessage = lastMessage
                    await room.save()
                    break
                }
            }
            res.sendSuccess()
        } catch (err) {
            res.sendFail(err.message)
        }
    })
}
