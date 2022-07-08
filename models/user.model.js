const mongoose = require('mongoose')

const User = mongoose.model(
    'user',
    new mongoose.Schema({
        username: String,
        email: String,
        password: String,
        isEmailVerified: Boolean,
        otp: String,
        avatar: Number,
        background: Number,
        otpDate: Date,
        blockedByAdmin: Boolean,
        childrenUsers: Array,
        reward: Number,
        myReferalcode: String,
        privateKey: String,
        publicKey: String,
        resendCount: Number,
        is_deleted: {
            type: String,
            enum: ['1', '0'],
            default: '0'
        },
        status: Number,
        token: String,
        is_login: {
            type: String,
            enum: ['1', '0'],
            default: '0'
        }
    }).set('timestamps', true)
)

module.exports = User