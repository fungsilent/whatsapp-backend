import moment from 'moment'
import mongoose from 'mongoose'
import User from '#root/db/models/User'
import Room from '#root/db/models/Room'
import Perspective from '#root/db/models/Perspective'
import Message from '#root/db/models/Message'
import { formatRoomInfo } from '#root/api/room'
import { hasValues, docToData } from '#root/utils'

export default (app, { requiredAuth }) => {
    // [Friend]----------------------------------------------------------------------
    /*
     * Search user list by username for add to friend
     * Method   GET
     * Fung Lee
     */
    app.get('/api/friend/search/:username', requiredAuth, async (req, res) => {
        try {
            const { username } = req.params
            let users = await User.find({ username: { $regex: new RegExp(username, 'i') } }, '-_id -password').lean()
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
            res.sendFail('Friend list no found')
        }
    })

    /*
     * Delete friend by roomId
     * Method   DELETE
     * Fung Lee
     */
    app.delete('/api/friend/remove', requiredAuth, async (req, res) => {
        try {
            const { roomId } = req.body
            const self = req.user

            const room = await Room.findById(roomId)
            if (room?.type !== 'friend') {
                return res.sendFail('Room not found')
            }

            // unilaterally remove a friend from own perspective first
            await Perspective.deleteOne({
                user: self,
                room: roomId,
            })

            switch (room.type) {
                case 'friend': {
                    const friends = await Perspective.find({ room }).lean()
                    if (!friends.length) {
                        // absolute delete room when both user remove friend each other
                        await Message.deleteMany({ room })
                        // TODO: also remove file
                        await room.deleteOne()
                    } else {
                        room.isDisable = true
                        await room.save()
                    }
                    break
                }
                case 'group': {
                    room.admin.pull(self)
                    room.member.pull(self)
                    if (!room.member.length) {
                        // absolute delete room when all user leave group
                        await Message.deleteMany({ room })
                        // TODO: also remove file
                        await room.deleteOne()
                    } else {
                        if (!room.admin.length) {
                            // make sure at least one admin exist
                            room.admin.push(room.member[0])
                        }
                        await room.save()
                    }
                    break
                }
            }

            res.sendSuccess(true)
        } catch (err) {
            console.log(err)
            res.sendSuccess(false)
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
            }).save()

            await new Perspective({
                user: self,
                room,
                type: room.type,
                isAdmin: true,
                lastReadMessage: null,
            }).save()

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
            const room = await Room.findById(roomId)
            if (room?.type !== 'group') {
                return res.sendFail('Group not found')
            }

            // check permission
            const isAdmin = room.admin.find(user => !user.equals(self))
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
            const isMember = !!room.member.find(id => id.equals(user))
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

            // send back updated group info
            const info = await formatRoomInfo(room, self)
            res.sendSuccess(info)
        } catch (err) {
            console.log(err)
            res.sendFail('Create group failed')
        }
    })

    /*
     * Remove group member by administrator
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
            const isAdmin = room.admin.find(user => !user.equals(self))
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

            await Promise.all([
                room.save(),
                await Perspective.deleteOne({
                    user,
                    room,
                }),
            ])

            // send back updated group info
            const info = await formatRoomInfo(room, self)
            // TODO: handle no member
            res.sendSuccess(info)
        } catch (err) {
            console.log(err)
            res.sendFail('Remove group member failed')
        }
    })
}
