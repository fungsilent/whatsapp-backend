import User from '#root/db/models/User'
import Room from '#root/db/models/Room'
import Perspective from '#root/db/models/Perspective'
import Message from '#root/db/models/Message'
import { formatRoomInfo, formatLastMessage } from '#root/api/room'
import { hasValues, docToData } from '#root/utils'

export default (app, io, { requiredAuth }) => {
    // [Friend]----------------------------------------------------------------------
    /*
     * Search user list by username for add to friend
     * Method   GET
     * Fung Lee
     */
    app.get('/api/friend/search/:username', requiredAuth, async (req, res) => {
        try {
            const { username } = req.params
            let users = await User.find({ username: { $regex: new RegExp(username, 'i') } }, '-password').lean()
            users = users.map(doc => docToData(doc))
            // TODO: pass user icon
            res.sendSuccess(users)
        } catch (err) {
            console.log(err)
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

            if (username === self.username) {
                return res.sendFail('Be friends with yourself?')
            }

            const friend = await User.findOne({ username }, '-password')
            if (!friend) {
                return res.sendFail('Friend not found')
            }

            const existRoom = await Room.findOne({
                type: 'friend',
                member: {
                    $all: [self, friend],
                },
                isDisable: false,
            })
            if (existRoom) {
                return res.sendSuccess({
                    isNew: false,
                    username: friend.username,
                    roomId: existRoom._id,
                })
            }

            const newRoom = await new Room({
                type: 'friend',
                member: [self, friend],
                lastMessage: null,
            }).save()
            new Perspective({
                user: self,
                room: newRoom,
                type: newRoom.type,
                lastReadMessage: null,
            }).save()
            new Perspective({
                user: friend,
                room: newRoom,
                type: newRoom.type,
                lastReadMessage: null,
            }).save()

            // add new room to users
            const roomData = {
                roomId: newRoom._id,
                type: newRoom.type,
                isDisable: newRoom.isDisable,
                lastMessage: null,
            }
            io.to(self._id.toString()).emit(io.event.NEW_ROOM, {
                ...roomData,
                name: friend.name,
                icon: friend.icon?.fileName || null,
            })
            io.to(friend._id.toString()).emit(io.event.NEW_ROOM, {
                ...roomData,
                name: self.name,
                icon: self.icon?.fileName || null,
            })

            res.sendSuccess({
                isNew: true,
                username: friend.username,
                roomId: newRoom._id,
            })
        } catch (err) {
            console.log(err)
            res.sendFail('Add friend failed')
        }
    })

    // [Group]----------------------------------------------------------------------

    /*
     * Create group
     * Method   POST
     * Fung Lee
     */
    app.post('/api/group/create', requiredAuth, async (req, res) => {
        try {
            const { name, icon } = req.body
            const self = req.user
            if (!name) {
                return res.sendFail('Group name required')
            }
            const room = await new Room({
                type: 'group',
                admin: [self],
                member: [self],
                lastMessage: null,
                name,
                // TODO: icon
                icon: null,
                createdBy: self,
            }).save()

            await new Perspective({
                user: self,
                room,
                type: room.type,
                isAdmin: true,
                lastReadMessage: null,
            }).save()

            // add new room to self
            io.to(self._id.toString()).emit(io.event.NEW_ROOM, {
                roomId: room._id,
                type: room.type,
                isDisable: room.isDisable,
                name: room.name,
                icon: room.icon?.fileName || null,
                lastMessage: null,
            })

            res.sendSuccess({
                roomId: room._id,
            })
        } catch (err) {
            console.log(err)
            res.sendFail('Create group failed')
        }
    })

    /*
     * Add user to group member
     * Method   POST
     * Fung Lee
     */
    app.post('/api/group/member/add', requiredAuth, async (req, res) => {
        try {
            const { username, roomId } = req.body
            const self = req.user

            // check room
            const room = await Room.findById(roomId).populate({
                path: 'lastMessage',
                populate: {
                    path: 'user',
                },
            })
            if (room?.type !== 'group') {
                return res.sendFail('Group not found')
            }

            // check permission
            const isAdmin = !!room.admin.find(user => user.equals(self._id))
            if (!isAdmin) {
                return res.sendFail('You are not a group administrator')
            }

            // check user
            if (username === self.username) {
                return res.sendFail('You already in group')
            }
            const user = await User.findOne({ username })
            if (!user) {
                return res.sendFail('User not found')
            }

            // is user already in group?
            const isMember = !!room.member.find(id => id.equals(user._id))
            if (isMember) {
                return res.sendFail('User already in group')
            }

            // add user to group
            room.member.push(user)
            await Promise.all([
                room.save(),
                new Perspective({
                    user,
                    room,
                    type: room.type,
                    lastMessage: null,
                }).save(),
            ])

            // update the latest room info to all room members
            const roomInfo = await formatRoomInfo(room)
            room.member.forEach(member => {
                io.to(member._id.toString()).emit(io.event.REFRESH_ROOM_INFO, roomInfo)
            })

            // add new room to user
            let lastMessage = null
            if (room.lastMessage) {
                lastMessage = {
                    type: room.lastMessage.type,
                    content: formatLastMessage(room.lastMessage),
                    date: room.lastMessage.createdAt,
                    by: room.lastMessage.user.name,
                }
            }
            const roomData = {
                roomId: room._id,
                type: room.type,
                isDisable: room.isDisable,
                name: room.name,
                icon: room.icon?.fileName || null,
                lastMessage,
            }
            io.to(user._id.toString()).emit(io.event.NEW_ROOM, roomData)

            // send back updated group info
            res.sendSuccess(roomData)
        } catch (err) {
            console.log(err)
            res.sendFail('Add group member failed')
        }
    })

    /*
     * Kick group member by administrator
     * Method   DELETE
     * Fung Lee
     */
    app.delete('/api/group/member/remove', requiredAuth, async (req, res) => {
        try {
            const { username, roomId } = req.body
            const self = req.user

            // check room
            const room = await Room.findById(roomId)
            if (room?.type !== 'group') {
                return res.sendFail('Group not found')
            }

            // check permission
            const isAdmin = !!room.admin.find(user => user.equals(self._id))
            if (!isAdmin) {
                return res.sendFail('You are not a group administrator')
            }

            // check user
            const user = await User.findOne({ username })
            if (!user) {
                return res.sendFail('User not found')
            }

            // remove member from group
            room.admin.pull(user)
            room.member.pull(user)

            await Perspective.deleteOne({
                user,
                room,
            })

            let data = {}
            if (room.member.length) {
                if (!room.admin.length) {
                    // make sure at least one admin exist
                    room.admin.push(room.member[0])
                }
                await room.save()
                const info = await formatRoomInfo(room)
                data = {
                    ...data,
                    ...info,
                }
            } else {
                // absolute delete room when no member in group
                await Promise.all[(room.deleteOne(), Perspective.deleteMany({ room }), Message.deleteMany({ room }))]
            }

            // update the latest room info to all room online members
            room.member.forEach(member => {
                io.to(member._id.toString()).emit(io.event.REFRESH_ROOM_INFO, data)
            })
            io.to(user._id.toString()).emit(io.event.REMOVE_ROOM, { roomId: room._id })

            res.sendSuccess(true)
        } catch (err) {
            console.log(err)
            res.sendFail('Remove group member failed')
        }
    })
}
