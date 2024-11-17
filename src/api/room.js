import User from '#root/db/models/User'
import Room from '#root/db/models/Room'
import Perspective from '#root/db/models/Perspective'
import Message from '#root/db/models/Message'
import { hasValues, docToData } from '#root/utils'

export default (app, io, { requiredAuth }) => {
    /*
     * Get room info
     * Method   GET
     * Fung Lee
     */
    app.get('/api/room/:roomId', requiredAuth, async (req, res) => {
        try {
            const { roomId } = req.params
            const self = req.user

            const room = await Room.findById(roomId)
            if (!room) {
                return res.sendFail('Room not found')
            }

            const info = await formatRoomInfo(room, self)
            res.sendSuccess(info)
        } catch (err) {
            console.log(err)
            res.sendFail('Fetch room info failed')
        }
    })

    /*
     * Get room message list
     * Method   GET
     * Fung Lee
     */
    app.get('/api/room/:roomId/message/list', requiredAuth, async (req, res) => {
        try {
            const { roomId } = req.params
            // const { page, perPage } = req.query
            const self = req.user

            const room = await Room.findById(roomId)
            if (!room) {
                return res.sendFail('Room not found')
            }

            const isMember = !!room.member.find(id => id.equals(self._id))
            if (!isMember) {
                return res.sendFail('Room not found')
            }

            /* TODO: paging */
            // const limit = Math.max(perPage, 1)
            // const skip = Math.max(page - 1, 0) * limit
            const messages = await Message.aggregate([
                { $match: { room: room._id } },
                // { $sort: { createdAt: -1 } },
                // { $skip: skip },
                // { $limit: limit },
                // { $sort: { createdAt: 1 } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        as: 'user',
                    },
                },
                { $unwind: '$user' },
                {
                    $project: {
                        _id: 0,
                        messageId: '$_id',
                        user: {
                            isSelf: {
                                $eq: ['$user._id', self._id],
                            },
                            id: '$user._id',
                            name: '$user.name',
                            username: '$user.username',
                        },
                        type: 1,
                        content: 1,
                        date: '$createdAt',
                    },
                },
            ])

            res.sendSuccess(messages)
        } catch (err) {
            console.log(err)
            res.sendFail('Fetch room message failed')
        }
    })

    /*
     * Send message to room
     * Method   POST
     * Fung Lee
     */
    app.post('/api/room/:roomId/message/add', requiredAuth, async (req, res) => {
        try {
            const { roomId } = req.params
            const { message } = req.body

            const room = await Room.findById(roomId)
            if (!room) {
                return res.sendFail('Room not found')
            }

            const newMessage = new Message({
                user: req.user,
                room,
                type: 'text',
                content: message,
            })
            await newMessage.save()

            // sent new message to all room online members
            room.member.forEach(memberId => {
                io.to(memberId.toString()).emit(io.event.NEW_ROOM_MESSAGE, {
                    roomId: room._id,
                    messageId: newMessage._id,
                    user: {
                        isSelf: newMessage.user._id.equals(memberId),
                        id: newMessage.user._id,
                        name: newMessage.user.name,
                        username: newMessage.user.username,
                    },
                    type: newMessage.type,
                    content: newMessage.content,
                    date: newMessage.createdAt,
                })
            })
            res.sendSuccess(true)
        } catch (err) {
            console.log(err)
            res.sendFail('Add message failed')
        }
    })
}

export const formatRoomInfo = async (room, self) => {
    let data = {}
    switch (room.type) {
        case 'friend': {
            const friendId = room.member.find(id => !id.equals(self._id))
            const friend = await User.findById(friendId).lean()

            data = {
                roomId: room._id,
                type: room.type,
                name: friend.name,
                username: friend.username,
                // TODO: icon URL
                icon: friend.icon?.fileName,
                isDisable: room.isDisable,
                createdAt: room.createdAt,
            }
            break
        }
        case 'group': {
            await room.populate('member')
            await room.populate('createdBy')
            const members = room.member.map(member => {
                return {
                    userId: member._id,
                    name: member.name,
                    username: member.username,
                    isAdmin: !!room.admin.find(id => id.equals(member._id)),
                }
            })

            data = {
                roomId: room._id,
                type: room.type,
                name: room.name,
                // TODO: icon URL
                icon: room.icon?.fileName,
                createdAt: room.createdAt,
                createdBy: {
                    userId: room.createdBy._id,
                    name: room.createdBy.name,
                    username: room.createdBy.username,
                },
                members,
                membersCount: members.length,
            }
            break
        }
    }
    return data
}
