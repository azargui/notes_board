import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    userName: {
        type: String, 
        required: true 
    },
    email: {
        type: String,
        required: true,
        unique: true, 
        index: true
    },
    password: {
        type: String, 
        required: true
    },
    role: { 
        type: String, 
        required: true, 
        default: ['user', 'admin'] 
    },

}, { timestamps: true });

export default mongoose.model('User', userSchema);