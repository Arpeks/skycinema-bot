const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SkySchema = new Schema({
    uuid: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    link: {
        type: String
    },
    picture: {
        type: String
    },
    phone: {
        type: String
    },
    email: {
        type: String
    },
    location: {
        type: Schema.Types.Mixed
    }
})

mongoose.model('sky', SkySchema)