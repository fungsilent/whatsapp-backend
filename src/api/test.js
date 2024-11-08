import Room from '#root/db/models/Room'
import Message from '#root/db/models/Message'
import User from '#root/db/models/User'

export default app => {
    app.get('/api/insert', async (req, res) => {
        try {
            const fung = await User.findOne({ username: 'fung' })
            const terry = await User.findOne({ username: 'terry' })
            const reze = await User.findOne({ username: 'Reze' })
            const { type } = req.query
            console.log('type', type)
            switch (type) {
                case 'group': {
                    const room = await new Room({
                        type: 'group',
                        admin: [terry],
                        member: [terry, fung, reze],
                        lastMessage: null,
                        name: 'JFSD',
                        icon: {
                            fileName: 'terry_icon.jpg',
                            type: 'image/jpeg',
                        },
                    })
                    await new Message({
                        user: terry,
                        type: 'text',
                        content: '遲10分鐘',
                    }).save()
                    await new Message({
                        user: fung,
                        type: 'text',
                        content: '+1',
                    }).save()
                    const lastMessage = await new Message({
                        user: reze,
                        type: 'text',
                        content: 'two',
                    }).save()
                    room.lastMessage = lastMessage
                    await room.save()
                    break
                }
                case 'friend': {
                    const room = await new Room({
                        type: 'user',
                        member: [fung, terry],
                        lastMessage: null,
                    })
                    await new Message({
                        user: fung,
                        type: 'text',
                        content: 'Hi',
                    }).save()
                    await new Message({
                        user: terry,
                        type: 'text',
                        content: '早喎',
                    }).save()
                    const lastMessage = await new Message({
                        user: terry,
                        type: 'text',
                        content: '我有野想問',
                    }).save()
                    room.lastMessage = lastMessage
                    await room.save()
                    break
                }
            }
            res.sendSuccess()
        } catch (err) {
            res.sendFail()
        }
    })
}
