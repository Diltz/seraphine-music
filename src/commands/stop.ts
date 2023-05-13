import { Database } from "better-sqlite3";
import { Client, CommandInteraction, Guild, GuildMember, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";

const clear_queue = require("../util/clear-queue.js")

async function execute(client: Client, interaction: CommandInteraction, db: Database) {
    const guild = interaction.guild as Guild

    if (!guild) return;

    const connection = getVoiceConnection(guild.id);

    if (!connection) {
        return interaction.reply({content: 'Я не нахожусь в голосовом канале!'})
    }

    const bot = guild.members.me || await guild.members.fetchMe()
    const channel = bot?.voice
    const member = interaction.member as GuildMember

    if (channel.channelId !== member.voice.channelId) {
        return interaction.reply({ephemeral: true, content: `Чтобы мной управлять зайди на канал ${channel}`})
    }

    clear_queue(interaction.guild, db)
    connection.destroy(true)
    interaction.reply({content: 'Музыка приостановлена!'})
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription('Остановить произведение')
        .setDMPermission(false),
    execute: execute
}