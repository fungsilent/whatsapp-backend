import mongoose from 'mongoose'

const MessageSchema = new mongoose.Schema({
    userId: { type: mongoose.Types.ObjectId, required: true },
    groupId: { type: mongoose.Types.ObjectId, ref: 'Group' },
    type: { type: String, enum: ['text', 'image', 'file', 'voice', 'code'], required: true },
    content: { type: String },
    fileName: { type: String },
    createdAt: { type: Date, default: Date.now },
})

export default mongoose.model('Message', MessageSchema)
