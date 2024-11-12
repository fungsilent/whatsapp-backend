import mongoose from 'mongoose'

const RoomSchema = new mongoose.Schema({
    type: { type: String, enum: ['friend', 'group'], required: true },
    admin: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
    member: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: mongoose.Types.ObjectId, ref: 'Message' },
    name: { type: String },
    icon: {
        fileName: { type: String },
        type: { type: String },
    },
    isDisable: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
})

export default mongoose.model('Room', RoomSchema)
