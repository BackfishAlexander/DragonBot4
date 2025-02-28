import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import dotenv from "dotenv";
import Database from 'better-sqlite3';


dotenv.config();
const db = new Database('playerCoins.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS balance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    GP INTEGER DEFAULT 0,
    SP INTEGER DEFAULT 0,
    CP INTEGER DEFAULT 0
  )
`);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });


function parseCurrency(input: string): [number, number, number] {
  // Initialize currency values. We'll use 'gp', 'sp', 'cp' as keys.
  const currencies = { gp: 0, sp: 0, cp: 0 };

  // Regular expression to capture a number followed by optional spaces and one of the currency identifiers (case insensitive).
  // This regex will match patterns like "5gp", "5 gp", "10SP", etc.
  const regex = /(-?\d+)\s*([gG][pP]|[sS][pP]|[cC][pP])/g;
  let found = false;
  let match: RegExpExecArray | null;

  // Loop through all matches in the input string.
  while ((match = regex.exec(input)) !== null) {
    found = true;
    const value = parseInt(match[1], 10);
    // Normalize the currency identifier to lower case.
    const currencyType = match[2].toLowerCase() as keyof typeof currencies;
    currencies[currencyType] += value;
  }

  // If no valid currency pattern is found, throw an error.
  if (!found) {
    throw new Error("Input must contain at least one currency value (gp, sp, cp).");
  }

  // Return an array in the order: [gp, sp, cp].
  return [currencies.gp, currencies.sp, currencies.cp];
}

function adjustBalance(userId: string, gpDelta: number, spDelta: number, cpDelta: number) {
  const selectStmt = db.prepare('SELECT * FROM balance WHERE userId = ?');
  const userBalance = selectStmt.get(userId);

  if (userBalance) {
    // Update existing record: add or subtract coins
    const updateStmt = db.prepare(`
      UPDATE balance 
      SET GP = GP + ?, SP = SP + ?, CP = CP + ?
      WHERE userId = ?
    `);
    updateStmt.run(gpDelta, spDelta, cpDelta, userId);
  } else {
    // For a "give" command, insert a new record.
    // (For removal, you might want to return an error instead.)
    const insertStmt = db.prepare(`
      INSERT INTO balance (userId, GP, SP, CP) 
      VALUES (?, ?, ?, ?)
    `);
    insertStmt.run(userId, Math.max(gpDelta, 0), Math.max(spDelta, 0), Math.max(cpDelta, 0));
  }
}


client.on(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'give') {
    const inputCurrencyString = interaction.options.get('amount')?.value;
    if (typeof inputCurrencyString !== 'string') {
      await interaction.reply({content: 'Error: Invalid currency notation.', flags: MessageFlags.Ephemeral});
      return;
    }
    const currency = parseCurrency(inputCurrencyString);


    adjustBalance(interaction.options.get('target')?.user?.id!, currency[0], currency[1], currency[2]);

    const userBalance: any = db.prepare('SELECT * FROM balance WHERE userId = ?').get(interaction.options.get('target')?.user?.id!);

    await interaction.reply(`Giving \`${currency[0]} GP\`, \`${currency[1]} SP\`, and \`${currency[2]} CP\` to ${interaction.options.get('target')?.user?.displayName}\nNew Balance: \`${userBalance.GP} GP\`, \`${userBalance.SP} SP\`, \`${userBalance.CP} CP\``);
  }

  if (interaction.commandName === 'remove') {
    const inputCurrencyString = interaction.options.get('amount')?.value;
    if (typeof inputCurrencyString !== 'string') {
      await interaction.reply({content: 'Error: Invalid currency notation.', flags: MessageFlags.Ephemeral});
      return;
    }
    const currency = parseCurrency(inputCurrencyString);

    adjustBalance(interaction.options.get('target')?.user?.id!, -currency[0], -currency[1], -currency[2]);

    const userBalance: any = db.prepare('SELECT * FROM balance WHERE userId = ?').get(interaction.options.get('target')?.user?.id!);

    await interaction.reply(`Removing \`${currency[0]} GP\`, \`${currency[1]} SP\`, and \`${currency[2]} CP\` from ${interaction.options.get('target')?.user?.displayName}\nNew Balance: \`${userBalance.GP} GP\`, \`${userBalance.SP} SP\`, \`${userBalance.CP} CP\``);
  }

  if (interaction.commandName === 'spend') {
    const inputCurrencyString = interaction.options.get('amount')?.value;
    if (typeof inputCurrencyString !== 'string') {
      await interaction.reply({content: 'Error: Invalid currency notation.', flags: MessageFlags.Ephemeral});
      return;
    }
    const currency = parseCurrency(inputCurrencyString);

    const userBalance: any = db.prepare('SELECT * FROM balance WHERE userId = ?').get(interaction.user.id);

    if (userBalance === undefined) {
      await interaction.reply('You do not have a DND profile. Please contact the Chad DM to use this feature.');
      return;
    }

    let GP = userBalance.GP;
    let SP = userBalance.SP;
    let CP = userBalance.CP;

    try {
      if (currency[0] < 0 || currency[1] < 0 || currency[2] < 0) {
        await interaction.reply('Do you seriously think I am that fucking retarded???');
        return;
      }

      if (
        userBalance.GP >= currency[0] &&
        userBalance.SP >= currency[1] &&
        userBalance.CP >= currency[2]
      ) {
        adjustBalance(interaction.user.id, -currency[0], -currency[1], -currency[2]);
      } else {
        if (userBalance.GP < currency[0]) {
          throw new Error('brokie');
        }
        while (SP < currency[1]) {
          GP -= 1;
          SP += 10;
          if (GP < 0) {
            throw new Error("brokie");
          }
        }

        while (CP < currency[2]) {
          if (SP > 0) {
            SP -= 1;
            CP += 10;
          }
          else if (GP > 0) {
            GP -= 1;
            SP += 9;
            CP += 10;
          }

          if (SP <= 0 && GP <= 0 && CP < currency[2]) {
            throw new Error('brokie');
          }
        }

        adjustBalance(interaction.user.id, (GP - userBalance.GP - currency[0]), (SP - userBalance.SP - currency[1]), (CP - userBalance.CP - currency[2]));
        userBalance.GP = (GP - currency[0]);
        userBalance.SP = (SP - currency[1]);
        userBalance.CP = (CP - currency[2]);
      }
    }
    catch {
      await interaction.reply('Nice try, brokie.');
      return;
    }



    await interaction.reply(`Spending \`${currency[0]} GP\`, \`${currency[1]} SP\`, and \`${currency[2]}\` CP\nNew Balance: \`${userBalance.GP} GP\`, \`${userBalance.SP} SP\`, \`${userBalance.CP} CP\``);
  }

  if (interaction.commandName === 'adminspend') {
    const inputCurrencyString = interaction.options.get('amount')?.value;
    if (typeof inputCurrencyString !== 'string') {
      await interaction.reply({content: 'Error: Invalid currency notation.', flags: MessageFlags.Ephemeral});
      return;
    }
    const currency = parseCurrency(inputCurrencyString);

    const userBalance: any = db.prepare('SELECT * FROM balance WHERE userId = ?').get(interaction.options.get('target')?.user?.id!);

    if (userBalance === undefined) {
      await interaction.reply('You do not have a DND profile. Please contact the Chad DM to use this feature.');
      return;
    }

    let GP = userBalance.GP;
    let SP = userBalance.SP;
    let CP = userBalance.CP;

    try {
      if (currency[0] < 0 || currency[1] < 0 || currency[2] < 0) {
        await interaction.reply('Do you seriously think I am that fucking retarded???');
        return;
      }

      if (
        userBalance.GP >= currency[0] &&
        userBalance.SP >= currency[1] &&
        userBalance.CP >= currency[2]
      ) {
        adjustBalance(interaction.options.get('target')?.user?.id!, -currency[0], -currency[1], -currency[2]);
      } else {
        if (userBalance.GP < currency[0]) {
          throw new Error('brokie');
        }
        while (SP < currency[1]) {
          GP -= 1;
          SP += 10;
          if (GP < 0) {
            throw new Error("brokie");
          }
        }

        while (CP < currency[2]) {
          if (SP > 0) {
            SP -= 1;
            CP += 10;
          }
          else if (GP > 0) {
            GP -= 1;
            SP += 9;
            CP += 10;
          }

          if (SP <= 0 && GP <= 0 && CP < currency[2]) {
            throw new Error('brokie');
          }
        }

        adjustBalance(interaction.options.get('target')?.user?.id!, (GP - userBalance.GP - currency[0]), (SP - userBalance.SP - currency[1]), (CP - userBalance.CP - currency[2]));
        userBalance.GP = (GP - currency[0]);
        userBalance.SP = (SP - currency[1]);
        userBalance.CP = (CP - currency[2]);
      }
    }
    catch {
      await interaction.reply('Nice try, brokie.');
      return;
    }



    await interaction.reply(`Spending \`${currency[0]} GP\`, \`${currency[1]} SP\`, and \`${currency[2]}\` CP\nNew Balance: \`${userBalance.GP} GP\`, \`${userBalance.SP} SP\`, \`${userBalance.CP} CP\` for ${interaction.options.get('target')?.user?.displayName}`);
  }

  if (interaction.commandName === 'balance') {
    const userBalance: any = db.prepare('SELECT * FROM balance WHERE userId = ?').get(interaction.user.id);
    if (userBalance === undefined) {
      await interaction.reply('You do not have a DND profile. Please contact the Chad DM to use this feature.');
      return;
    }

    await interaction.reply(`${interaction.user.displayName} has \`${userBalance.GP} GP\`, \`${userBalance.SP} SP\`, \`${userBalance.CP} CP\``);
  }

  if (interaction.commandName === 'viewwallet') {
    const userBalance: any = db.prepare('SELECT * FROM balance WHERE userId = ?').get(interaction.options.get('target')?.user?.id!);
    if (userBalance === undefined) {
      await interaction.reply('You do not have a DND profile. Please contact the Chad DM to use this feature.');
      return;
    }

    await interaction.reply(`${interaction.options.get('target')?.user?.displayName} has \`${userBalance.GP} GP\`, \`${userBalance.SP} SP\`, \`${userBalance.CP} CP\``);
  }


});

// Login to Discord with your app's token
client.login(process.env.TOKEN);