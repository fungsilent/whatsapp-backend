import mongoose from 'mongoose'

const GroupSchema = new mongoose.Schema({
    admin: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
    user: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
    name: { type: String },
    icon: { type: String },
    createdAt: { type: Date, default: Date.now },
})

export default mongoose.model('Group', GroupSchema)
