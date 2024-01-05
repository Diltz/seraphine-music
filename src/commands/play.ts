import { PlaylistData, SpotifyClient, TrackInfo } from 'node-spotify-web'
import ytdl from 'ytdl-core'
import ytpl from 'ytpl'
import ytsr from '@distube/ytsr'
import { Client, Guild, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import {Database} from 'better-sqlite3'

// create function next track to play use db to get next track, don't forget to remove current track from queue using it's position from function argument

const next_track = require("../util/next-track.js")
const clear_queue = require("../util/clear-queue.js")

const SPOTIFY_TRACK_REGEX = /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+\?si=[A-Za-z0-9]+$/;
const SPOTIFY_PLAYLIST_REGEX = /^https:\/\/open\.spotify\.com\/playlist\/[A-Za-z0-9]+\?si=[A-Za-z0-9]+$/;

// create spotify client

const Spotify = new SpotifyClient(process.env.spotify_clientid as string, process.env.spotify_secret as string)
Spotify.authenticate([])

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

    // reset queue if no voice connection

    if (!bot_member?.voice.channel) {
        clear_queue(guild, db)
    }

    // defer reply

    await interaction.deferReply()

    let url = search.replace(/'/g, "''")

    // support for playlists

    if (ytpl.validateID(url)) {

        // get playlist

        let playlist

        try {
            playlist = await ytpl(url, {pages: 0, limit: 50})
        } catch (error) {
            console.log(error);
            return interaction.editReply({content: 'Не удалось получить информацию о плейлисте :x:'})
        }

        // remove live tracks

        playlist.items = playlist.items.filter((item: any) => !item.isLive)

        // add tracks to queue

        playlist.items.forEach((item: any) => {
            // add track to queue

            db.prepare("INSERT INTO queue (guild_id, search, name, requested, channelid) VALUES (?, ?, ?, ?, ?)").run(guild.id, item.shortUrl, item.title, member.user.id, interaction.channel.id)
        })

        await interaction.editReply({content: `Добавлено ${playlist.items.length} треков в очередь :white_check_mark:`})
        
        if (!getVoiceConnection(guild.id)) {
            try {
                next_track(guild, db, interaction.channel)
            } catch (error) {
                console.error(`Issue occured in ${guild.id}\nError: ${error}`)
            }
        }

        return
    }

    // spotify

    if (SPOTIFY_TRACK_REGEX.test(url)) { // track link
        const id = url.split('/')[4].split('?si')[0]
        let result: TrackInfo

        try {
            result = await Spotify.getTrackInfo(id) as TrackInfo
        } catch {
            return interaction.editReply({content: `Не удалось получить информацию о треке :x:`})
        }

        url = `${result.name} - ${result.artists.join(', ')}`
        await interaction.editReply({content: `<:spotify:1175190471002312786> Получен трек **${url}**. Поиск.. <a:load:1175190469534298225>`})
    } else if (SPOTIFY_PLAYLIST_REGEX.test(url)) { // playlist link
        const id = url.split('/')[4].split('?si')[0]
        let result: PlaylistData
        let tracks: {name: string, url: string}[] = []

        try {
            result = await Spotify.getPlaylist(id) as PlaylistData
        } catch {
            return interaction.editReply({content: `Не удалось получить информацию о плейлисте :x:`})
        }

        await interaction.editReply({content: `<:spotify:1175190471002312786> Получен плейлист **${result.name}**. Поиск **${result.tracks.length}** треков.. <a:load:1175190469534298225>`})

        // find every track in yt

        for await (const track of result.tracks) {
            let search_results = await ytsr(`${track.name} - ${track.artists.join(', ')}`, {limit: 1})
            search_results.items = search_results.items.filter((item: any) => !item.isLive && item.type === 'video')

            if (search_results.items.length > 0) {
                let video: any = search_results.items[0]
                tracks.push({name: video.title, url: video.url})
            }
        }

        tracks.forEach((item) => {
            db.prepare("INSERT INTO queue (guild_id, search, name, requested, channelid) VALUES (?, ?, ?, ?, ?)").run(guild.id, item.url, item.name, member.user.id, interaction.channel.id)
        })

        await interaction.editReply({content: `Добавлено ${tracks.length} треков в очередь :white_check_mark:`})
        
        if (!getVoiceConnection(guild.id)) {
            try {
                next_track(guild, db, interaction.channel)
            } catch (error) {
                console.error(`Issue occured in ${guild.id}\nError: ${error}`)
            }
        }

        return
    }

    //

    if (!ytdl.validateURL(url)) {
        let search_results = await ytsr(url, {limit: 1})
        search_results.items = search_results.items.filter((item: any) => !item.isLive && item.type === 'video')

        if (search_results.items.length > 0) {
            const video: any = search_results.items[0]
            url = video.url
        }
    }

    // get info about track from youtube

    let track_info

    try {
        track_info = await ytdl.getBasicInfo(url, {
            requestOptions: {
                headers: {
                    Cookie: process.env.ytcookie
                }
            }
        })
    } catch (error) {
        console.log(error);
        return interaction.editReply({content: 'Не удалось получить данные о треке :x:'})
    }

    // check if track is live

    if (track_info.videoDetails.isLiveContent) {
        return interaction.editReply({content: 'Нельзя воспроизводить трансляции :x:'})
    }

    // check queue, if there any tracks in queue, add track to queue

    db.prepare("INSERT INTO queue (guild_id, search, channelid, requested, name) VALUES (?, ?, ?, ?, ?)").run(guild.id, url, interaction.channel.id, interaction.user.id, track_info.videoDetails.title)
    
    const queue: any = db.prepare("SELECT COUNT(*) FROM queue WHERE guild_id = ?").get(guild.id)

    if (queue["COUNT(*)"] !== 1) {
        return interaction.editReply({content: `Трек **${track_info.videoDetails.title}** добавлен в очередь под номером **${queue["COUNT(*)"]}** :white_check_mark:`})
    }

    interaction.editReply({content: `Запускаю трек **${track_info.videoDetails.title}**`})

    try {
        next_track(guild, db, interaction.channel)
    } catch (error) {
        console.error(`Issue occured in ${guild.id}\nError: ${error}`)
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription('Играть')
        .setDMPermission(false)
        .addStringOption(option => option.setName('поиск').setDescription('Поиск').setRequired(true)),
    execute: execute
}