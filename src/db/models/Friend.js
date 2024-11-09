import mongoose from 'mongoose'

const FriendSchema = new mongoose.Schema({
    user: { type: mongoose.Types.ObjectId, ref: 'User' },
    room: { type: mongoose.Types.ObjectId, ref: 'Room' },
    lastReadMessage: { type: mongoose.Types.ObjectId, ref: 'Message' },
    createdAt: { type: Date, default: Date.now },
})

export default mongoose.model('Friend', FriendSchema)
