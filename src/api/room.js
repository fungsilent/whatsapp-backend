import mongoose from 'mongoose'
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
                createdAt: room.createdAt,
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
                createdAt: room.createdAt,
                members,
                membersCount: members.length,
            }
            break
        }
    }
    return data
}
