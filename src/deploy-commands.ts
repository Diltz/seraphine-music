import {REST, Routes} from 'discord.js'
import dotenv from 'dotenv'
import fs from 'fs'

// init config

dotenv.config({path: __dirname + "/.env"})

// env params

const token = process.env.token || ''
const clientid = process.env.clientid || ''

//

const rest = new REST({version: '10'}).setToken(token)

const commands_directory = fs.readdirSync(__dirname + "/commands").filter(file => file.endsWith(".js"))
const body = []

for (let file of commands_directory) {
    let cmd = require(__dirname + "/commands/" + file)
    
    body.push(cmd.data.toJSON())
}

(async () => {
    try {
        console.log('Registering slash commands...')

        await rest.put(Routes.applicationCommands(clientid), { body: body });

        console.log("Successfully registered slash commands.")
    } catch (error) {
        console.error(error)
    }
})()