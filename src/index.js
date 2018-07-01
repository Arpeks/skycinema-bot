process.env["NTBA_FIX_319"] = 1

const TelegramBot = require('node-telegram-bot-api')
const mongoose = require('mongoose')
const geolin = require('geolib')
const _ = require('lodash')

const config = require('./config')
const helper = require('./helper')
const keyboard = require('./keyboard')
const kb = require('./keyboard_buttons')
const database = require('../database.json')

const bot = new TelegramBot(config.TOKEN, {
    polling: true,
    request: { proxy: 'http://46.101.121.186:1697' }
})

helper.logStart()
mongoose.connect(config.DB_URL)
    .then(() => console.log('MongoDB conected!'))
    .catch((err) => console.log(err))

require('./models/film.model')
require('./models/sky.model')
require('./models/user.model')
const Film = mongoose.model('films')
const Sky = mongoose.model('sky')
const User = mongoose.model('users')

// database.films.forEach(f => new Film(f).save().catch(e => console.log(e)))
// new Sky(database.sky).save().catch(e => console.log(e))

const ACTION_TYPE = {
    TOGGLE_FAV_FILM: 'tff'
}

// =================================================

bot.on('message', msg => {
    const chatID = helper.getChatID(msg)

    switch(msg.text) {
        case kb.home.favourite:
            showFavouriteFilms(chatID, msg.from.id)
            break
        case kb.films.map:
            Sky.findOne({}).then(c => {
                bot.sendLocation(chatID, c.location.latitude, c.location.longitude)
            }).catch(err => console.log(err))
            break
        case kb.home.films:
            sendFilmsByQuery(chatID, {})
            break
        case kb.home.about:
            getSkyInfo(chatID)
            break
        case kb.films.list:
            sendFilmsByQuery(chatID, {})
            break
        case kb.back:
            bot.sendMessage(chatID, `Выберите команду для начала работы:`, {
                reply_markup: {
                    keyboard: keyboard.home
                }
            })
            break
    }

    if(msg.location) {
        getSkyInfo(chatID, msg.location)
    }

})

bot.onText(/\/start/, msg => {
    const text = `Здравствуйте, ${msg.from.first_name}\nВыберите команду для начала работы:`
    bot.sendMessage(helper.getChatID(msg), text, {
        reply_markup: {
            keyboard: keyboard.home
        }
    })
})

bot.onText(/\/f(.+)/, (msg, [source, match]) => {
    const filmUuid = helper.getItemUuid(source)
    const chatID = helper.getChatID(msg)

    Promise.all([
        Film.findOne({uuid: filmUuid}),
        User.findOne({telegramID: msg.from.id})
    ]).then(([f, user]) => {

        let isFav = false

        if(user) {
            isFav = user.films.indexOf(f.uuid) !== -1
        }

        const favText = isFav ? 'Удалить из избранного' : 'Добавить в избранное'
        const caption = `Название: ${f.name}\nЖанр: ${f.type}\nГод: ${f.year}\nРейтинг: ${f.rate}\nДлительность: ${f.length} мин\nСтрана: ${f.country}`

        bot.sendPhoto(chatID, f.picture, {
            caption: caption,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: favText,
                            callback_data: JSON.stringify({
                                type: ACTION_TYPE.TOGGLE_FAV_FILM,
                                filmUuid: f.uuid,
                                isFav: isFav
                            })
                        }
                    ],
                    [
                        {
                            text: `Кинопоиск '${f.name}'`,
                            url: f.link
                        }
                    ]
                ]
            }
        })
    })
})

bot.on('callback_query', query => {
    const userID = query.from.id

    let data

    try {
        data = JSON.parse(query.data)
    } catch (e) {
        throw new Error('Data is not an object')
    }

    const {type} = data

    switch(type) {
        case ACTION_TYPE.TOGGLE_FAV_FILM:
            toogleFavouriteFilm(userID, query.id, data)
            break
    }
})

bot.on('inline_query', query => {
    Film.find({}).then(films => {
        let results = films.map(f => {
            const caption = `Название: ${f.name}\nЖанр: ${f.type}\nГод: ${f.year}\nРейтинг: ${f.rate}\nДлительность: ${f.length} мин\nСтрана: ${f.country}`
            return {
                id: f.uuid,
                type: 'photo',
                photo_url: f.picture,
                thumb_url: f.picture,
                caption: caption,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: `Кинопоиск: ${f.name}`,
                                url: f.link
                            }
                        ]
                    ]
                }
            }
        })
        results = _.sortBy(results, 'id')
        bot.answerInlineQuery(query.id, results, {
            cache_time: 0
        })
    }).catch(err => console.log(err))
})

// =================================================

function getSkyInfo(chatID, location = null) {
    Sky.findOne({}).then(c => {
        let skyTemp

        if(c[0]) {
            skyTemp = c[0]
        }
        else {
            skyTemp = c
        }

        if(location) {
            skyTemp.distance = geolin.getDistance(skyTemp.location, location) / 1000
        }

        let caption = `Название: <b>${skyTemp.name}</b>\nТелефон: <b>${skyTemp.phone}</b>\nПочта: <a href="mailto://${skyTemp.email}">${skyTemp.email}</a>\nСайт: <a href="${skyTemp.link}">${skyTemp.link}</a>`

        if(location) {
            caption += `\nДо кинотеатра: <b>${skyTemp.distance} км</b>`
        }

        bot.sendPhoto(chatID, skyTemp.picture, {
            caption: caption,
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: [
                    [
                        {
                            text: 'Отправить местоположение',
                            request_location: true
                        },
                        kb.films.map
                    ],
                    [kb.back]
                ]
            }
        })
    }).catch(err => console.log(err))
}

function sendFilmsByQuery(chatID, query) {
    Film.find(query).then(films => {
        films = _.sortBy(films, 'uuid')
        const html = films.map((f,i) => {
            return `<b>${i+1}</b>. ${f.name} - /${f.uuid}`
        }).join('\n')

        sendHTML(chatID, 'Выберите фильм из списка:\n\n'+html, 'films')
    })
}

function sendHTML(chatID, html, kbName = null) {
    const options = {
        parse_mode: 'HTML'
    }
    if(kbName) {
        options['reply_markup'] = {
            keyboard: keyboard[kbName]
        }
    }
    bot.sendMessage(chatID, html, options)
}

function toogleFavouriteFilm(userID, queryID, {filmUuid, isFav}) {
    let userPromise

    User.findOne({telegramID:userID}).then(user => {
        if(user) {
            if(isFav) {
                user.films = user.films.filter(fUuid => fUuid !== filmUuid)
            } else {
                user.films.push(filmUuid)
            }
            userPromise = user
        } else {
            userPromise = new User({
                telegramID: userID,
                films: [filmUuid]
            })
        }

        const answerText = isFav ? 'Удалено' : 'Добавлено'

        userPromise.save().then(_ => {
            bot.answerCallbackQuery({
                callback_query_id: queryID,
                text: answerText
            })
        }).catch(err => console.log(err))
    }).catch(err => console.log(err))
}

function showFavouriteFilms(chatID, telegramID) {
    User.findOne({telegramID}).then(user => {
        if(user) {
            Film.find({uuid: {'$in': user.films}}).then(films => {
                let html
                if(films.length) {
                    html = films.map((f,i) => {
                        return `<b>${i+1}</b>. ${f.name} - <b>${f.rate}</b> (/${f.uuid})`
                    }).join('\n')
                } else {
                    html = 'Вы пока ничего не добавили'
                }

                sendHTML(chatID, html, 'home')
            }).catch(err => console.log(err))
        } else {
            sendHTML(chatID, 'Вы пока ничего не добавили', 'home')
        }
    }).catch(err => console.log(err))
}
