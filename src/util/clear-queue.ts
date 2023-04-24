import { Guild } from "discord.js"
import { Database } from "better-sqlite3"

function clear_queue(guild: Guild, db: Database) {
    db.prepare("DELETE FROM queue WHERE guild_id = ?").run(guild.id)
}

module.exports = clear_queue