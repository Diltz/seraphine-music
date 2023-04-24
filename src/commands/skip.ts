import { VoiceConnection, getVoiceConnection } from "@discordjs/voice";
import { Database } from "better-sqlite3";
import { Client, CommandInteraction, Guild, GuildMember, SlashCommandBuilder, VoiceBasedChannel, VoiceChannel } from "discord.js";

const next_track = require("../util/next-track.js")

async function execute(client: Client, interaction: CommandInteraction, db: Database) {
    const guild = interaction.guild as Guild

    if (!guild) return;

    const user: GuildMember = interaction.member as GuildMember
    const userVoice: VoiceBasedChannel = user.voice.channel as VoiceChannel
    const botVoice: VoiceBasedChannel = (await guild.members.fetchMe()).voice.channel as VoiceChannel
    const connection: VoiceConnection = await getVoiceConnection(guild.id) as VoiceConnection

    if (!userVoice || botVoice.id !== userVoice.id) return interaction.reply({ephemeral: true, content: "Вы должны находиться в одном канале с ботом!"})
    if (!connection) return interaction.reply({ephemeral: true, content: "Бота нет в голосовом канале!"})

    const track: any = db.prepare("SELECT * FROM queue WHERE guild_id = ? ORDER BY position ASC LIMIT 1").get(guild.id)

    if (!track) return interaction.reply({ephemeral: true, content: "Сейчас ничего не играет!"})

    db.prepare("DELETE FROM queue WHERE guild_id = ? AND position = ?").run(guild.id, track.position)
    next_track(guild, db, await guild.channels.fetch(track.channelid))

    interaction.reply({ephemeral: true, content: "Трек пропущен!"})
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("skip")
        .setDescription('Пропустить текущий трек')
        .setDMPermission(false),
    execute: execute
}