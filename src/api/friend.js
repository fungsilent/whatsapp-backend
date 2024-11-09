import User from '#root/db/models/User'
import Room from '#root/db/models/Room'
import Friend from '#root/db/models/Friend'
import { hasValues, docToData } from '#root/utils'
import moment from 'moment'

export default (app, { requiredAuth }) => {
    /*
     * Search user list by username for add to friend
     * Method   GET
     * Fung Lee
     */
    app.get('/api/friend/search/:username', requiredAuth, async (req, res) => {
        try {
            const { username } = req.params
            let users = await User.find({ username }, '-password').lean()
            users = users.map(doc => docToData(doc))
            res.sendSuccess(users)
        } catch (err) {
            console.log(err.message)
            res.sendSuccess('User not found')
        }
    })

    /*
     * Add user to friend by username
     * Method   POST
     * Fung Lee
     */
    app.post('/api/friend/add', requiredAuth, async (req, res) => {
        try {
            const { username } = req.body
            const self = req.user
            const friend = await User.findOne({ username }, '-password')
            if (!friend) {
                return res.sendFail('Friend not found')
            }

            const existRoom = await Room.findOne({
                type: 'friend',
                member: {
                    $all: [self, friend],
                },
            })
            if (existRoom) {
                return res.sendSuccess({
                    isNew: false,
                    roomId: existRoom._id,
                })
            }

            const newRoom = new Room({
                type: 'friend',
                member: [self, friend],
                lastMessage: null,
            })
            await newRoom.save()
            res.sendSuccess({
                isNew: true,
                roomId: newRoom._id,
            })
        } catch (err) {
            res.sendFail('Add friend failed')
        }
    })

    /*
     * Add user to friend by username
     * Method   GET
     * Fung Lee
     */
    app.get('/api/friend/list', requiredAuth, async (req, res) => {
        try {
            /* function */
            const formatLastMessage = lastMessage => {
                switch (lastMessage.type) {
                    case 'text': {
                        return (lastMessage.content || '').substring(0, 50)
                    }
                    // TODO: frontend handle ?
                    case 'image':
                    case 'file':
                    case 'voice':
                    case 'code': {
                    }
                }
            }

            /* friend */
            const friends = await Room.find({
                type: 'friend',
                member: req.user,
            })
                .populate({
                    path: 'lastMessage',
                })
                .populate({
                    path: 'member',
                    select: '-password -createdAt',
                    match: { _id: { $ne: req.user } },
                })
                .lean()

            const friendList = friends.map(room => {
                const friend = room.member?.[0]
                let lastMessage = null
                if (room.lastMessage) {
                    lastMessage = {
                        type: room.lastMessage.type,
                        content: formatLastMessage(room.lastMessage),
                        date: room.lastMessage.createdAt,
                    }
                }

                return {
                    roomId: room._id,
                    type: room.type,
                    name: friend.name,
                    icon: friend.icon?.fileName || null,
                    lastMessage,
                }
            })

            /* groups */
            const groups = await Room.find({
                type: 'group',
                member: req.user,
            }).populate({
                path: 'lastMessage',
                populate: {
                    path: 'user',
                    model: 'User',
                },
            })

            const groupList = groups.map(room => {
                let lastMessage = null
                if (room.lastMessage) {
                    lastMessage = {
                        type: room.lastMessage.type,
                        content: formatLastMessage(room.lastMessage),
                        date: room.lastMessage.createdAt,
                        by: room.lastMessage.user.name,
                    }
                }

                return {
                    roomId: room._id,
                    type: room.type,
                    name: room.name,
                    icon: room.icon?.fileName || null,
                    lastMessage,
                }
            })

            const list = [...friendList, ...groupList].sort((a, b) => {
                // descending
                return moment(b.lastMessage?.date) - moment(a.lastMessage?.date)
            })
            res.sendSuccess(list)
        } catch (err) {
            res.sendFail('Friend list no found')
        }
    })

    /*
     * Add user to friend by username
     * Method   GET
     * Fung Lee
     */
    // app.get('/api/friend/list', requiredAuth, async (req, res) => {
    //     try {
    //         // const
    //     } catch (err) {}
    // })
}
