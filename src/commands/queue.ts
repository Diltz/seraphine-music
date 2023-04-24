import { Database } from "better-sqlite3";
import { Client, CommandInteraction, Guild, SlashCommandBuilder } from "discord.js";

async function execute(client: Client, interaction: CommandInteraction, db: Database) {
    const guild = interaction.guild as Guild

    if (!guild) return;

    const queue = db.prepare("SELECT * FROM queue WHERE guild_id = ? ORDER BY position ASC LIMIT 25").all(guild.id)

    if (queue.length === 0) {
        return interaction.reply({ephemeral: true, content: 'Очередь пуста'})
    } else {
        let queue_message = "Очередь треков:\n"

        queue.forEach((track: any, index: number) => {
            // if first track in queue, add now playing

            if (index === 0) {
                queue_message += `Сейчас играет: **${track.name}** - <@${track.requested}>\n`
            } else {
                queue_message += `${index}. ${track.name} - <@${track.requested}>\n`
            }
        })

        return interaction.reply({ephemeral: true, content: queue_message})
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription('Очередь треков')
        .setDMPermission(false),
    execute: execute
}