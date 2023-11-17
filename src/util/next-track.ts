import ytdl from 'ytdl-core'
import { EmbedBuilder, Guild, GuildBasedChannel, TextChannel, VoiceBasedChannel, VoiceChannel } from "discord.js";
import { createAudioPlayer, createAudioResource, VoiceConnection, getVoiceConnection, joinVoiceChannel, AudioResource, AudioPlayerStatus, demuxProbe } from "@discordjs/voice";
import {Database} from 'better-sqlite3'
import internal from 'stream';

async function probeAndCreateResource(readableStream: internal.Readable) {
	const { stream, type } = await demuxProbe(readableStream);
	return createAudioResource(stream, { inputType: type, inlineVolume: true });
}

async function next_track(guild: Guild, db: Database, channel: GuildBasedChannel): Promise<any> {
    const track: any = db.prepare("SELECT * FROM queue WHERE guild_id = ? ORDER BY position ASC LIMIT 1").get(guild.id)
    
    if (!track) {
        let connection: VoiceConnection = await getVoiceConnection(guild.id) as VoiceConnection

        if (connection) {
            connection.destroy()
        }

        return (channel as TextChannel).send({content: "Очередь закончена. Отключаюсь."})
    }

    // change channel

    channel = await guild.channels.fetch(track.channelid) as TextChannel

    //
    
    const user = await guild.members.fetch(track.requested)
    const userVoice: VoiceBasedChannel = user.voice.channel as VoiceChannel
    const player = await createAudioPlayer()
    const connection: VoiceConnection = await joinVoiceChannel({
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        channelId: userVoice.id
    })

    await connection.subscribe(player)

    //

    // download

    let stream

    try {
        stream = ytdl(track.search, {
            filter: "audioonly",
            quality: 'highestaudio',
            highWaterMark: 1 << 25,
            requestOptions: {
                headers: {
                    'Cookie': process.env.ytcookie
                },
            },
        })
    } catch (error) {
        console.error(error);

        channel.send({content: `${user}, не удалось загрузить трек: **${track.name}**!`})
        await player.stop()
        return next_track(guild, db, channel)
    }

    // play

    let audioResource: AudioResource = await probeAndCreateResource(stream)
    audioResource.volume?.setVolume(0.5) // so audio will sound more clear

    player.play(audioResource);

    //

    const embed = new EmbedBuilder()
        .setTitle('Сейчас играет')
        .addFields(
            {name: 'Трек', value: `[${track.name}](${track.search}) / <:youtube:1175190473359491162>`},
            {name: 'Заказал', value: `<@${user.id}>`, inline: true},
            {name: 'Канал', value: `<#${userVoice.id}>`, inline: true}
        )
        .setFooter({text: 'developed by diltz'})
        .setTimestamp()

    channel.send({embeds: [embed]})

    //

    player.on(AudioPlayerStatus.Idle, async () => {
        db.prepare("DELETE FROM queue WHERE guild_id = ? AND position = ?").run(guild.id, track.position)
        await player.stop(true)
        try {
            next_track(guild, db, channel)
        } catch (error) {
            console.error(`Issue occured in ${guild.id}\nError: ${error}`)
        }
    })
}

module.exports = next_track
