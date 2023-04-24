import {Client, IntentsBitField} from 'discord.js'
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

// handle cmds

client.on("interactionCreate", async interaction => {
  if (interaction.isCommand()) {
    const path = `${__dirname}/commands/${interaction.commandName}.js`
    const cmd = require(path)

    try {
      cmd.execute(client, interaction, db)
    } catch (error) {
      console.log(error)
      interaction.reply({ephemeral: true, content: 'Ошибка взаимодействия!'})
    }
  }
})

require(__dirname + "/deploy-commands.js")

// login

client.login(process.env.token)