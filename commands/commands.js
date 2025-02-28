import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

const commands = [
    new SlashCommandBuilder()
        .setName('give')
        .setDescription('Gives user currency')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('How much GP, SP, or CP to add')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('amount')
                .setDescription('How much GP, SP, or CP to remove')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Removes user currency')
    .addUserOption(option =>
        option
            .setName('target')
            .setDescription('Who to remove currency from')
            .setRequired(true))
    .addStringOption(option =>
        option
            .setName('amount')
            .setDescription('How much GP, SP, or CP to remove')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('spend')
        .setDescription('Lets players spend their currency')
        .addStringOption(option => 
            option
                .setName('amount')
                .setDescription('How much GP, SP, or CP to spend')
                .setRequired(true)),

    new SlashCommandBuilder()
    .setName('adminspend')
    .setDescription('Spend other people\'s money')
    .addUserOption(option =>
        option
            .setName('target')
            .setDescription('Who to remove currency from')
            .setRequired(true))
    .addStringOption(option => 
        option
            .setName('amount')
            .setDescription('How much GP, SP, or CP to spend')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
    .setName('viewwallet')
    .setDescription('View other people\'s money')
    .addUserOption(option =>
        option
            .setName('target')
            .setDescription('Who\'s wallet to view')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
            .setName('balance')
            .setDescription('Gives the players wallet balance')
  ];

export default commands;