const express = require('express')
const compression = require("compression")
const cookieParser = require('cookie-parser')
const cookieSession = require('cookie-session')
const cors = require('cors')
const errorHandler   = require('errorhandler')
const fileUpload = require('express-fileupload')
const fs = require('fs')
const mongoose = require('mongoose')
const path = require('path')

const config = require('./config/config')

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(compression())
app.use(cookieParser())
app.use(fileUpload())

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next()
})

app.use(cookieSession({
    name: 'session',
    keys: ["roostercookie"],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))

if (app.get('env') === 'development')
    app.use(errorHandler({ dumpExceptions: true, showStack: true }))
else if (app.get('env') === 'production')
    app.use(errorHandler())

app.set('port', config.base.port)

const model = require("./models")

model.mongoose.connect(`mongodb://${config.database.host}:${config.database.port}/${config.database.db}`, {useNewUrlParser: true, useUnifiedTopology: true})
.then(() => {
    console.log("Connected to mongoose has been established successfully.")
})
.catch(err => {
    console.log("Connection error", error)
    process.exit()
})

var server
if (process.env.NODE_ENV == "production") {
    var https_options = {
    }
    server = require('https').createServer(https_options, app)
} 
else {
    // app.use(express.static('client/build'));
    // app.get("*", (req, res) => {
    //     res.sendFile(
    //         path.resolve(__dirname, "client", "build", "index.html")
    //     );
    // });
    server = require('http').createServer(app)
}

server.listen(config.base.port, function () {
    console.log("server starting on " + config.base.url + ":" + config.base.port)
})

require('./routes/user.route')(app)

