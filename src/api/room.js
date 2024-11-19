import moment from 'moment'
import User from '#root/db/models/User'
import Room from '#root/db/models/Room'
import Perspective from '#root/db/models/Perspective'
import Message from '#root/db/models/Message'
import { hasValues, docToData } from '#root/utils'

export default (app, io, { requiredAuth }) => {
    /*
     * Get all user chats include friend and group
     * Method   GET
     * Fung Lee
     */
    app.get('/api/room/list', requiredAuth, async (req, res) => {
        try {
            const self = req.user

            /* friend */
            const friends = await Perspective.find({
                user: self,
                type: 'friend',
            })
                .populate({
                    path: 'room',
                    populate: [
                        {
                            path: 'member',
                            match: { _id: { $ne: req.user } },
                        },
                        {
                            path: 'lastMessage',
                        },
                    ],
                })
                .lean()
            const friendList = friends.map(doc => {
                const room = doc.room
                const friend = room.member.shift()

                let lastMessage = null
                if (room.lastMessage) {
                    lastMessage = {
                        type: room.lastMessage.type,
                        content: formatLastMessage(room.lastMessage),
                        date: room.lastMessage.createdAt,
                        by: null,
                    }
                }

                return {
                    roomId: room._id,
                    type: room.type,
                    isDisable: room.isDisable,
                    name: friend.name,
                    icon: friend.icon?.fileName || null,
                    lastMessage,
                }
            })

            /* groups */
            const groups = await Perspective.find({
                user: self,
                type: 'group',
            })
                .populate({
                    path: 'room',
                    populate: {
                        path: 'lastMessage',
                        populate: {
                            path: 'user',
                        },
                    },
                })
                .lean()
            const groupList = groups.map(doc => {
                const room = doc.room
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
                    isDisable: room.isDisable,
                    name: room.name,
                    icon: room.icon?.fileName || null,
                    lastMessage,
                }
            })

            const list = [...friendList, ...groupList].sort((a, b) => {
                // descending
                return moment(b.lastMessage?.date).valueOf() - moment(a.lastMessage?.date).valueOf()
            })
            res.sendSuccess(list)
        } catch (err) {
            console.log(err)
            res.sendFail('Fetch room list failed')
        }
    })

    /*
     * Delete chat by roomId
     * Method   DELETE
     * Fung Lee
     */
    app.delete('/api/room/remove', requiredAuth, async (req, res) => {
        try {
            const { roomId } = req.body
            const self = req.user

            const room = await Room.findById(roomId)
            if (!room) {
                return res.sendFail('Room not found')
            }

            // unilaterally remove a friend from own perspective first
            await Perspective.deleteOne({
                user: self,
                room: roomId,
            })

            switch (room.type) {
                case 'friend': {
                    const friends = await Perspective.find({ room }).populate('user').lean()
                    if (friends.length) {
                        room.isDisable = true
                        await room.save()

                        // update friend the room been disabled
                        io.to(friends[0].user._id.toString()).emit(io.event.DISABLE_ROOM, { roomId })
                    } else {
                        // absolute delete room when both user remove friend each other
                        await Message.deleteMany({ room })
                        // TODO: also remove file
                        await room.deleteOne()
                    }
                    break
                }
                case 'group': {
                    room.admin.pull(self)
                    room.member.pull(self)
                    if (room.member.length) {
                        if (!room.admin.length) {
                            // make sure at least one admin exist
                            room.admin.push(room.member[0])
                        }
                        await room.save()

                        // update member the someone leave group room
                        room.member.forEach(memberId => {
                            io.to(memberId.toString()).emit(io.event.MEMBER_LEAVE_ROOM, {
                                roomId,
                                memberId: self._id,
                            })
                        })
                    } else {
                        // absolute delete room when all user leave group
                        await Message.deleteMany({ room })
                        // TODO: also remove file
                        await room.deleteOne()
                    }
                    break
                }
            }

            // update self to remove room
            io.to(self._id.toString()).emit(io.event.REMOVE_ROOM, { roomId })

            res.sendSuccess(true)
        } catch (err) {
            console.log(err)
            res.sendFail('Remove failed')
        }
    })

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
    app.post('/api/room/:roomId/message/send', requiredAuth, async (req, res) => {
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

            room.lastMessage = newMessage
            await room.save()

            // sent new message to all room online members
            room.member.forEach(memberId => {
                io.to(memberId.toString()).emit(io.event.NEW_ROOM_MESSAGE, {
                    room: {
                        id: room._id,
                        type: room.type,
                    },
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

export const formatLastMessage = lastMessage => {
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
