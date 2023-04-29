import { SlashCommandBuilder, Client, CommandInteraction } from "discord.js";

async function execute(client: Client, interaction: CommandInteraction) {
    interaction.reply({content: `Понг! ${client.ws.ping}мс`, ephemeral: true})
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription('Показывает круговую задержку бота')
        .setDMPermission(true),
    execute: execute
}