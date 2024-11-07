import Friend from '#root/db/models/Friend'
import Group from '#root/db/models/Group'
import Message from '#root/db/models/Message'
import User from '#root/db/models/User'

export default app => {
    app.get('/api/insert', async (req, res) => {
        try {
            const user1 = await User.findOne({ username: 'fung' })
            const user2 = await User.findOne({ username: 'terry' })
            const { type } = req.query
            console.log('type', type)
            switch (type) {
                case 'message': {
                    await new Message({
                        userId: user1,
                        type: 'text',
                        content: 'Hi',
                    }).save()
                    await new Message({
                        userId: user2,
                        type: 'text',
                        content: 'Hello',
                    }).save()
                    break
                }
                case 'group': {
                    const group = await new Group({
                        admin: [user2],
                        userId: [user2, user1],
                        name: 'JFSD',
                        icon: 'something.jpg',
                    }).save()
                    await new Friend({
                        userId: user1,
                        type: 'group',
                        targetGroupId: group,
                    }).save()
                    await new Friend({
                        userId: user2,
                        type: 'group',
                        targetGroupId: group,
                    }).save()
                    break
                }
                case 'friend': {
                    await new Friend({
                        userId: user1,
                        type: 'user',
                        targetUserId: user2,
                    }).save()
                    await new Friend({
                        userId: user2,
                        type: 'user',
                        targetUserId: user1,
                    }).save()
                    break
                }
            }
            res.sendSuccess()
        } catch (err) {
            res.sendFail()
        }
    })
}
