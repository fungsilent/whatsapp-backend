import mongoose from 'mongoose'

const FriendSchema = new mongoose.Schema({
    userId: { type: mongoose.Types.ObjectId, required: true },
    type: { type: String, enum: ['user', 'group'], required: true },
    targetUserId: { type: mongoose.Types.ObjectId, ref: 'User' },
    targetGroupId: { type: mongoose.Types.ObjectId, ref: 'Group' },
    lastMessageId: { type: mongoose.Types.ObjectId, ref: 'Message' },
    createdAt: { type: Date, default: Date.now },
})

export default mongoose.model('Friend', FriendSchema)
