const mongoose = require('mongoose')
const Schema = mongoose.Schema

const FilmSchema = new Schema({
    uuid: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    year: {
        type: Number
    },
    rate: {
        type: Number
    },
    length: {
        type: Number
    },
    country: {
        type: String
    },
    link: {
        type: String
    },
    picture: {
        type: String
    }
})

mongoose.model('films', FilmSchema)