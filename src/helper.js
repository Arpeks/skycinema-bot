module.exports = {

    logStart() {
        console.log('Bot has been started ...')
    },

    getChatID(msg) {
        return msg.chat.id
    },

    getItemUuid(source) {
        return source.substr(1, source.length)
    }

}