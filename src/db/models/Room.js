import mongoose from 'mongoose'

const RoomSchema = new mongoose.Schema({
    type: { type: String, enum: ['user', 'group'], required: true },
    admin: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
    member: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: mongoose.Types.ObjectId, ref: 'Message' },
    name: { type: String },
    icon: { type: String },
    createdAt: { type: Date, default: Date.now },
})

export default mongoose.model('Room', RoomSchema)
