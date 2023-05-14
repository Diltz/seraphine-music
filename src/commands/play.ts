import ytdl from 'ytdl-core'
import ytpl from 'ytpl'
import ytsr from 'ytsr'
import { Client, Guild, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import {Database} from 'better-sqlite3'

// create function next track to play use db to get next track, don't forget to remove current track from queue using it's position from function argument

const next_track = require("../util/next-track.js")

//

async function execute(client: Client, interaction: any, db: Database) {
    const member = interaction.member
    const voiceChannel: VoiceChannel = member.voice.channel;
    const guild: Guild = interaction.guild

    // parse option

    const search: string = interaction.options.getString('поиск')

    // validate user in vc

    if (!member.voice.channel) {
        return interaction.reply({ephemeral: true, content: 'Вы должны быть в голосовом канале!'})
    }

    // validate in right vc

    const bot_member = guild.members.me

    if (bot_member?.voice.channelId !== voiceChannel.id && bot_member?.voice.channel) {
        return interaction.reply({ephemeral: true, content: `Чтобы мной управлять зайди на канал ${bot_member?.voice.channel}`})
    }

    // defer reply

    await interaction.deferReply()

    //

    let url = search.replace(/'/g, "''")

    // support for playlists

    if (ytpl.validateID(url)) {

        // get playlist

        let playlist

        try {
            playlist = await ytpl(url, {pages: 0, limit: 50})
        } catch (error) {
            console.log(error);

            return interaction.editReply({content: 'Не удалось получить информацию о плейлисте'})
        }

        // remove live tracks

        playlist.items = playlist.items.filter((item: any) => !item.isLive)

        // add tracks to queue

        playlist.items.forEach((item: any, index: number) => {
            // get position

            const position = db.prepare("SELECT * FROM queue WHERE guild_id = ?").all(guild.id).length + index + 1

            // add track to queue

            db.prepare("INSERT INTO queue (guild_id, search, name, requested, channelid) VALUES (?, ?, ?, ?, ?)").run(guild.id, item.shortUrl, item.title, member.user.id, interaction.channel.id)
        })

        await interaction.editReply({content: `Добавлено ${playlist.items.length} треков в очередь`})
        
        if (!getVoiceConnection(guild.id)) {
            next_track(guild, db, interaction.channel)
        }

        return
    }

    //

    if (!ytdl.validateURL(url)) {
        let search_results = await ytsr(url, {pages: 1, limit: 1})
        search_results.items = search_results.items.filter((item: any) => !item.isLive && item.type === 'video')

        if (search_results.items.length === 0) {
            return interaction.editReply({content: 'Ничего не найдено'})
        }

        const video: any = search_results.items[0]
        url = video.url
    }

    // get info about track from youtube

    let track_info

    try {
        track_info = await ytdl.getBasicInfo(url)
    } catch (error) {
        console.log(error);
        return interaction.editReply({content: 'Не удалось получить информацию о треке'})
    }

    // check if track is live

    if (track_info.videoDetails.isLiveContent) {
        return interaction.editReply({content: 'Нельзя воспроизводить трансляции'})
    }

    // check queue, if there any tracks in queue, add track to queue

    db.prepare("INSERT INTO queue (guild_id, search, channelid, requested, name) VALUES (?, ?, ?, ?, ?)").run(guild.id, url, interaction.channel.id, interaction.user.id, track_info.videoDetails.title)
    
    const queue: any = db.prepare("SELECT COUNT(*) FROM queue WHERE guild_id = ?").get(guild.id)

    if (queue["COUNT(*)"] !== 1) {
        return interaction.editReply({content: `Трек **${track_info.videoDetails.title}** добавлен в очередь под номером **${queue["COUNT(*)"]}**`})
    }

    interaction.editReply({content: `Запускаю трек **${track_info.videoDetails.title}**`})
    next_track(guild, db, interaction.channel)
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription('Играть')
        .setDMPermission(false)
        .addStringOption(option => option.setName('поиск').setDescription('Поиск').setRequired(true)),
    execute: execute
}