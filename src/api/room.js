import User from '#root/db/models/User'
import Room from '#root/db/models/Room'
import Perspective from '#root/db/models/Perspective'
import Message from '#root/db/models/Message'
import { hasValues, docToData } from '#root/utils'

export default (app, { requiredAuth }) => {
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
    app.get('/api/room/:roomId/message', requiredAuth, async (req, res) => {
        try {
            const { roomId } = req.params
            const { page, perPage } = req.query
            const self = req.user

            const room = await Room.findById(roomId)
            if (!room) {
                return res.sendFail('Room not found')
            }

            const isMember = !!room.member.find(id => id.equals(self._id))
            if (!isMember) {
                return res.sendFail('Room not found')
            }

            const limit = Math.max(perPage, 1)
            const skip = Math.max(page - 1, 0) * limit
            const messages = await Message.aggregate([
                { $match: { room: room._id } },
                { $sort: { createdAt: 1 } },
                { $skip: skip },
                { $limit: limit },
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
}

export const formatRoomInfo = async (room, self) => {
    let data = {}
    switch (room.type) {
        case 'friend': {
            const friend = await Perspective.findOne({
                room,
                user: { $ne: self },
            })
                .populate('user')
                .lean()

            data = {
                roomId: room._id,
                type: room.type,
                name: friend.user.name,
                // TODO: icon URL
                icon: friend.user.icon?.fileName,
                isDisable: room.isDisable,
                date: room.createdAt,
            }
            break
        }
        case 'group': {
            let members = await Perspective.find({ room }).populate('user').lean()
            members = members.map(member => {
                const user = member.user
                return {
                    userId: member._id,
                    name: user.name,
                    username: user.username,
                    isAdmin: member.isAdmin,
                }
            })
            data = {
                roomId: room._id,
                type: room.type,
                name: room.name,
                // TODO: icon URL
                icon: room.icon?.fileName,
                date: room.createdAt,
                members,
                membersCount: members.length,
            }
            break
        }
    }
    return data
}
