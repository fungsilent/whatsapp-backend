import mongoose from 'mongoose'

const PerspectiveSchema = new mongoose.Schema({
    user: { type: mongoose.Types.ObjectId, ref: 'User' },
    room: { type: mongoose.Types.ObjectId, ref: 'Room' },
    lastReadMessage: { type: mongoose.Types.ObjectId, ref: 'Message' },
    isAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
})

export default mongoose.model('Perspective', PerspectiveSchema)
