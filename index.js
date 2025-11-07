// ==================================================
// 🤖 XO BOT v9.1 — نسخة محسّنة بالكامل بالعربية 🇸🇦
// ==================================================

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");

// ==================================================
// 🔐 تحميل التوكن من البيئة
const token = process.env.BOT_TOKEN ? process.env.BOT_TOKEN.trim() : null;
console.log("🔍 فحص BOT_TOKEN...");
if (!token) {
  console.error("❌ BOT_TOKEN غير موجود في البيئة!");
  process.exit(1);
}

// ==================================================
// 🚀 إنشاء البوت
const bot = new TelegramBot(token, { polling: true });
let botUsername = null;

// ==================================================
// 💾 تحميل بيانات اللاعبين (قابل للتخصيص عبر PLAYERS_PATH)
const PLAYERS_PATH = process.env.PLAYERS_PATH || path.join(process.cwd(), "players.json");
let players = {};
function savePlayers() {
  try {
    const dir = path.dirname(PLAYERS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PLAYERS_PATH, JSON.stringify(players, null, 2), "utf8");
  } catch (err) {
    console.error("⚠️ خطأ أثناء حفظ البيانات:", err.message);
  }
}
try {
  if (!fs.existsSync(PLAYERS_PATH)) fs.writeFileSync(PLAYERS_PATH, "{}", "utf8");
  const data = fs.readFileSync(PLAYERS_PATH, "utf8");
  players = data && data.trim() ? JSON.parse(data) : {};
} catch (err) {
  players = {};
  savePlayers();
}

// ==================================================
// 🧍‍♂️ دالة تأكيد أو إنشاء لاعب جديد
function ensurePlayer(user) {
  if (!user || !user.id) return null;
  const id = String(user.id);
  if (!players[id]) {
    players[id] = {
      id: user.id,
      name: user.first_name || user.username || "مستخدم",
      points: 1, // 🌟 نقطة ترحيب أول مرة
      team: null,
    };
  } else {
    players[id].name = user.first_name || user.username || players[id].name;
  }
  savePlayers();
  return players[id];
}

// ==================================================
// 🎮 وظائف اللعبة
function newBoard() {
  return [[" ", " ", " "], [" ", " ", " "], [" ", " ", " "]];
}
function renderBoard(board) {
  return {
    reply_markup: {
      inline_keyboard: board.map((row, i) =>
        row.map((cell, j) => ({
          text: cell === " " ? "⬜" : cell === "X" ? "❌" : "⭕",
          callback_data: `${i},${j}`,
        }))
      ),
    },
  };
}
function checkWinner(b) {
  for (let i = 0; i < 3; i++) {
    if (b[i][0] === b[i][1] && b[i][1] === b[i][2] && b[i][0] !== " ") return b[i][0];
    if (b[0][i] === b[1][i] && b[1][i] === b[2][i] && b[0][i] !== " ") return b[0][i];
  }
  if (b[0][0] === b[1][1] && b[1][1] === b[2][2] && b[0][0] !== " ") return b[0][0];
  if (b[0][2] === b[1][1] && b[1][1] === b[2][0] && b[0][2] !== " ") return b[0][2];
  return null;
}

// ==================================================
// 🏅 دالة منح النقاط بعد اللعبة الخاصة
function awardPointsPrivateGame(gameId, winnerSymbol) {
  const game = games[gameId];
  if (!game || !game.p1 || !game.p2) return;
  const p1 = ensurePlayer(game.p1);
  const p2 = ensurePlayer(game.p2);

  if (!winnerSymbol) {
    p1.points += 5;
    p2.points += 5;
  } else if (winnerSymbol === "X") {
    p1.points += 10;
    p2.points += 2;
  } else {
    p2.points += 10;
    p1.points += 2;
  }
  savePlayers();
}

// ==================================================
// 🧠 بيانات الذاكرة
const games = {};
const challenges = {};

// ==================================================
// 🔔 جاهزية البوت
bot.getMe().then((me) => {
  botUsername = me.username;
  console.log(`✅ البوت جاهز: @${botUsername}`);
});

// ==================================================
// 🏁 /start — ترحيب محسّن بالكامل
bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
  const user = msg.from;
  const chatId = msg.chat.id;
  const param = match[1];
  const player = ensurePlayer(user);

  if (param && param.startsWith("ch_")) {
    const id = param.replace("ch_", "");
    const ch = challenges[id];
    if (!ch) return bot.sendMessage(chatId, "❌ هذا التحدي غير صالح أو انتهى.");

    if (ch.p1.id === user.id)
      return bot.sendMessage(chatId, "⚠️ لا يمكنك تحدي نفسك.");

    ch.p2 = { id: user.id, name: user.first_name };
    ch.board = newBoard();
    ch.turn = "X";

    const msg1 = await bot.sendMessage(
      ch.p1.id,
      `🎮 ضد ${ch.p2.name}\n🎯 دورك أنت (❌)`,
      renderBoard(ch.board)
    );
    const msg2 = await bot.sendMessage(
      ch.p2.id,
      `🎮 ضد ${ch.p1.name}\n🎯 دور خصمك الآن`,
      renderBoard(ch.board)
    );

    games[id] = {
      type: "private",
      board: ch.board,
      turn: "X",
      p1: ch.p1,
      p2: ch.p2,
      msgs: {
        [ch.p1.id]: msg1.message_id,
        [ch.p2.id]: msg2.message_id,
      },
    };

    delete challenges[id];
    return;
  }

  // 👋 ترحيب احترافي جديد
  const welcome = `
👋 أهلاً وسهلاً بك يا *${player.name}*!  
مرحباً بك في لعبة **XO Bot** — التحدي الذكي 🤖🎮  

🎯 *نقاطك الحالية:* \`${player.points}\` نقطة  
✨ كل فوز = +10، تعادل = +5، خسارة = +2  

🧠 الأوامر المتاحة:
• /newgame — بدء لعبة في القروب  
• /challenge — تحدي صديق في الخاص  
• /نقاطي — عرض نقاطك الحالية  
• /setteam <اسم الفريق> — لتعيين فريقك  
• /نتائج_الفريق — عرض نتائج الفرق  

🏆 ابدأ اللعب الآن وكن أسطورة XO!  
`;

  bot.sendMessage(chatId, welcome, { parse_mode: "Markdown" });
});

// ==================================================
// ⚔️ /challenge
bot.onText(/\/challenge/, (msg) => {
  const user = msg.from;
  const id = Math.random().toString(36).slice(2, 10);
  challenges[id] = { p1: user };
  bot.sendMessage(
    msg.chat.id,
    `🎮 تم إنشاء التحدي!\nأرسل هذا الرابط لصديقك:\n👉 https://t.me/${botUsername}?start=ch_${id}\n\nعندما يفتح الرابط، ستبدأ اللعبة تلقائياً.`
  );
});

// ==================================================
// 👥 /newgame (في القروبات فقط)
bot.onText(/\/newgame/, (msg) => {
  // لا تسمح بالأمر في الخاص
  if (msg.chat.type === "private") {
    return bot.sendMessage(msg.chat.id, "❗ هذا الأمر متاح في القروبات فقط.");
  }

  const chatId = msg.chat.id;
  const user = msg.from;
  ensurePlayer(user);

  // إذا كانت هناك لعبة جارية في القروب
  if (games[chatId]) {
    return bot.sendMessage(chatId, "⚠️ هناك لعبة جارية بالفعل في هذه القروب.");
  }

  games[chatId] = {
    type: "group",
    board: newBoard(),
    players: [{ id: user.id, name: user.first_name }],
    turn: null,
    messageId: null,
    timer: null,
  };

  bot
    .sendMessage(
      chatId,
      `👤 ${user.first_name} بدأ لعبة جديدة!\n🕓 أمام اللاعبين 15 ثانية للانضمام.`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "🎮 انضمام إلى اللعبة", callback_data: "join" }]],
        },
      }
    )
    .then((sent) => {
      games[chatId].messageId = sent.message_id;
      games[chatId].timer = setTimeout(() => {
        // انقضاء وقت الانضمام: إذا لا لاعبين كافيين قم بإزالة اللعبة
        if (games[chatId] && games[chatId].players.length < 2) {
          bot.sendMessage(chatId, "⏰ لم ينضم لاعبين كافيين. تم إلغاء اللعبة.");
          clearTimeout(games[chatId].timer);
          delete games[chatId];
        } else {
          // ابدأ اللعبة (مثال بسيط)
          games[chatId].turn = "X";
          bot.sendMessage(chatId, "✅ بدأت اللعبة!");
        }
      }, 15000);
    });
});

// ==================================================
// 🏆 عرض النقاط
bot.onText(/^(?:\/نقاطي|\/points)$/, (msg) => {
  const player = ensurePlayer(msg.from);
  bot.sendMessage(msg.chat.id, `🏅 نقاطك الحالية: ${player.points} نقطة`);
});

// ==================================================
// 🏅 الفرق
bot.onText(/^(?:\/setteam)\s+(.+)$/i, (msg, match) => {
  const teamName = match[1].trim();
  const player = ensurePlayer(msg.from);
  player.team = teamName;
  savePlayers();
  bot.sendMessage(msg.chat.id, `✅ تم تعيين فريقك إلى: ${teamName}`);
});

bot.onText(/^(?:\/نتائج_الفريق|\/teamresults)$/, (msg) => {
  const teams = {};
  Object.values(players).forEach((p) => {
    const t = p.team || "بدون فريق";
    if (!teams[t]) teams[t] = 0;
    teams[t] += p.points || 0;
  });

  const sorted = Object.entries(teams)
    .sort((a, b) => b[1] - a[1])
    .map(([t, p]) => `• ${t}: ${p} نقطة`);

  bot.sendMessage(
    msg.chat.id,
    sorted.length ? `📊 نتائج الفرق:\n${sorted.join("\n")}` : "لا توجد بيانات بعد."
  );
});

// ==================================================
// 🎯 التفاعل مع الأزرار
bot.on("callback_query", async (query) => {
  const { message, from, data } = query;
  const gameId = Object.keys(games).find(
    (id) =>
      games[id].type === "private" &&
      ((games[id].p1.id === from.id && games[id].turn === "X") ||
        (games[id].p2.id === from.id && games[id].turn === "O"))
  );
  if (!gameId)
    return bot.answerCallbackQuery(query.id, { text: "⚠️ لا توجد لعبة نشطة!" });;
  const game = games[gameId];  const game = games[gameId];
  const [i, j] = data.split(",").map(Number);(",").map(Number);
  if (game.board[i][j] !== " ") ")
    return bot.answerCallbackQuery(query.id, { text: "❗ هذه الخانة مشغولة!" });id, { text: "❗ هذه الخانة مشغولة!" });

  const symbol = game.turn;
  game.board[i][j] = symbol; = symbol;
  game.turn = symbol === "X" ? "O" : "X";=== "X" ? "O" : "X";

  const winnerSymbol = checkWinner(game.board);
  let result = "";
  if (winnerSymbol) {
    result = `🏆 الفائز: ${winnerSymbol === "X" ? game.p1.name : game.p2.name}!`;== "X" ? game.p1.name : game.p2.name}!`;
    awardPointsPrivateGame(gameId, winnerSymbol);Symbol);
    delete games[gameId];
  } else if (game.board.flat().every((c) => c !== " ")) {f (game.board.flat().every((c) => c !== " ")) {
    result = "🤝 انتهت اللعبة بالتعادل!";
    awardPointsPrivateGame(gameId, null); awardPointsPrivateGame(gameId, null);
    delete games[gameId];    delete games[gameId];
  } else {e {
    result = `🎯 دور ${game.turn === "X" ? game.p1.name : game.p2.name}`;ame}`;
  }

  try {
    await bot.editMessageText(`🎮 ضد ${game.p2.name}\n${result}`, {it bot.editMessageText(`🎮 ضد ${game.p2.name}\n${result}`, {
      chat_id: game.p1.id,
      message_id: game.msgs[game.p1.id],s[game.p1.id],
      ...renderBoard(game.board),
    });
    await bot.editMessageText(`🎮 ضد ${game.p1.name}\n${result}`, {it bot.editMessageText(`🎮 ضد ${game.p1.name}\n${result}`, {
      chat_id: game.p2.id,ame.p2.id,
      message_id: game.msgs[game.p2.id],      message_id: game.msgs[game.p2.id],
      ...renderBoard(game.board),
    }); });
  } catch (e) {}  } catch (e) {}





console.log("🚀 XO Bot v9.1 قيد التشغيل...");});  bot.answerCallbackQuery(query.id);  bot.answerCallbackQuery(query.id);
});

console.log("🚀 XO Bot v9.1 قيد التشغيل...");