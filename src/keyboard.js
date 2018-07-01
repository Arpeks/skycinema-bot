const kb = require('./keyboard_buttons')

module.exports = {
    home: [
        [kb.home.films, kb.home.about],
        [kb.home.favourite]
    ],
    films: [
        [kb.films.list],
        [kb.back]
    ]
}