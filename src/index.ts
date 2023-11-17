import { readdirSync } from 'fs'
import {Client, CommandInteraction, IntentsBitField} from 'discord.js'
import dotenv from 'dotenv'
import bettersqlite3 from 'better-sqlite3'
import path from 'path'

// init db

const db: bettersqlite3.Database = new bettersqlite3(__dirname + "/data.db")

// create table queue if not exists it has 3 columns: guild_id (text) position (int) search (text), channelid (text), requested by (text)

db.prepare(`CREATE TABLE IF NOT EXISTS queue 
  (
  guild_id     TEXT,
  position     INTEGER PRIMARY KEY ASC ON CONFLICT ROLLBACK AUTOINCREMENT,
  search       TEXT,
  name         TEXT,
  channelid    TEXT,
  requested    TEXT
  )
`).run()

// clear queue on load

db.prepare("DELETE FROM queue").run()

// init dotenv

dotenv.config({path: path.resolve("./.env")})

// init client

const client = new Client({intents: [
  IntentsBitField.Flags.GuildVoiceStates,
  IntentsBitField.Flags.Guilds
]})

// load cmds

type CommandData = {name: string, execute: (client: Client, interaction: CommandInteraction, db: bettersqlite3.Database) => void}
const commands: CommandData[] = []

readdirSync(__dirname + '/commands', { encoding: 'utf-8' }).forEach((name: string) => {
  commands.push({
    name: name.split('.')[0],
    execute: require(__dirname + '/commands/' + name).execute
  })
})

client.on("interactionCreate", async interaction => {
  if (interaction.isCommand()) {
    let commandName = interaction.commandName
    let data = commands.find(data => data.name == commandName)

    if (!data) {
      interaction.reply({ content: 'Я не знаю как работать с этой командой :(' });
      return
    }

    try {
      data.execute(client, interaction, db)
    } catch (error) {
      console.log(`[Command Error - ${commandName}] ${error}\nDate: ${new Date().toLocaleString()}`)

      let reply = { content: 'Ошибка выполнения команды **X_X**' }

      if (interaction.replied || interaction.deferred) {
        interaction.editReply(reply)
      } else {
        interaction.reply(reply)
      }
    }
  }
})

require(__dirname + "/deploy-commands.js")

// login

client.login(process.env.token)