import mongoose from 'mongoose'

const MessageSchema = new mongoose.Schema({
    user: { type: mongoose.Types.ObjectId, required: true },
    room: { type: mongoose.Types.ObjectId, ref: 'Group' },
    type: { type: String, enum: ['text', 'image', 'file', 'voice', 'code'], required: true },
    content: { type: String },
    file: {
        fileName: { type: String },
        type: { type: String },
    },
    createdAt: { type: Date, default: Date.now },
})

export default mongoose.model('Message', MessageSchema)
