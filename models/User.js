import mongoose from 'mongoose';

const usreSchema = mongoose.Schema({
    userName: {
        type: String, 
        required: true 
    },
    email: {
        type: String,
        required: true,
        unique: true, // unique index
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


}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)