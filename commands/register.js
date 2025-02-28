import { REST, Routes } from 'discord.js';
import commands from "./commands.js";
import dotenv from "dotenv";


dotenv.config();

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

try {
  console.log(`Started refreshing application (/) commands.`);

  let response = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

  console.log(response);
  console.log('Successfully reloaded application (/) commands.');
} catch (error) {
  console.error(error);
}