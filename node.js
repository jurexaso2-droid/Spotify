const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "spotify",
  version: "1.1.0",
  credits: "RexDev (Fixed)",
  role: 0,
  hasPrefix: false,
  aliases: [],
  description: "Search and download Spotify track with success tracking.",
  usage: "spotify [song name]",
  cooldown: 5,
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  if (!args[0]) {
    return api.sendMessage(
      "╭━━━━━━━❍\n  ⚠️ 𝚄𝚂𝙰𝙶𝙴\n╰━━━━━━━━━━━━━━━❍\n\n ❯ 𝙿𝚕𝚎𝙰𝚜𝚎 𝚙𝚛𝚘𝚟𝚒𝚍𝚎 𝚊 𝚜𝚘𝚗𝚐 𝚗𝚊𝚖𝚎.\n━━━━━━━━━━━━━━━━━━",
      threadID,
      messageID
    );
  }

  const keyword = args.join(" ");
  // Using await to ensure we have the message object before trying to edit it later
  const loadingMsg = await new Promise((resolve) => {
    api.sendMessage(`🔍 𝚃𝚛𝚊𝚌𝚔𝚒𝚗𝚐: "${keyword}"...`, threadID, (err, info) => {
      resolve(info);
    });
  });

  try {
    const searchURL = `https://betadash-api-swordslush-production.up.railway.app/spt?title=${encodeURIComponent(keyword)}`;
    
    // Add headers to mimic a browser, helps avoid 403 errors
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    const searchRes = await axios.get(searchURL, { headers });
    const track = searchRes.data;

    if (!track || !track.download_url) {
      if (loadingMsg) api.unsendMessage(loadingMsg.messageID);
      return api.sendMessage("❌ 𝙽𝚘 𝚂𝚙𝚘𝚝𝚒𝚏𝚢 𝚝𝚛𝚊𝚌𝚔 𝚏𝚘𝚞𝚗𝚍 𝚘𝚛 𝚕𝚒𝚗𝚔 𝚒𝚜 𝚋𝚛𝚘𝚔𝚎𝚗.", threadID, messageID);
    }

    // Prepare paths
    const cacheDir = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const imgPath = path.join(cacheDir, `thumb_${senderID}_${Date.now()}.jpg`);
    const audioPath = path.join(cacheDir, `audio_${senderID}_${Date.now()}.mp3`);

    // Download Image
    let hasImage = false;
    if (track.image && track.image.startsWith("http")) {
      try {
        const imgRes = await axios.get(track.image, { 
            responseType: "arraybuffer", 
            timeout: 10000,
            headers 
        });
        fs.writeFileSync(imgPath, Buffer.from(imgRes.data));
        hasImage = true;
      } catch (e) {
        hasImage = false;
      }
    }

    // Download Audio
    const audioRes = await axios.get(track.download_url, { 
        responseType: "arraybuffer", 
        timeout: 60000,
        headers
    });
    fs.writeFileSync(audioPath, Buffer.from(audioRes.data));

    // Prepare Info Message
    let infoMsg = `╭━━━━━━━❍\n  🎧 𝚂𝙿𝙾𝚃𝙸𝙵𝚈 𝙳𝙾𝚆𝙽𝙻𝙾𝙰𝙳\n╰━━━━━━━━━━━━━━━❍\n\n`;
    infoMsg += ` ❯ 𝚃𝚒𝚝𝚕𝚎: ${track.title || "Unknown"}\n`;
    infoMsg += ` ❯ 𝙰𝚛𝚝𝚒𝚜𝚝: ${track.artists || "Unknown"}\n\n`;
    infoMsg += `━━━━ 𝚂𝚃𝙰𝚃𝚄𝚂 ━━━━\n\n`;
    infoMsg += ` ✅ 𝚂𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢 𝚃𝚛𝚊𝚌𝚔𝚎𝚍!\n`;
    infoMsg += `\n━━━━━━━━━━━━━━━━━━\n`;
    infoMsg += ` ✨ 𝙳𝚎𝚟: RexDev\n`;
    infoMsg += `━━━━━━━━━━━━━━━━━━`;

    const sendInfo = { body: infoMsg };
    if (hasImage) sendInfo.attachment = fs.createReadStream(imgPath);

    // Send Info Message
    api.sendMessage(sendInfo, threadID, async (err, info) => {
      // Send Audio File
      const sendAudio = {
        body: `🎶 𝙷𝚎𝚛𝚎'𝚜 𝚢𝚘𝚞𝚛 𝚜𝚘𝚗𝚐: ${track.title}`,
        attachment: fs.createReadStream(audioPath)
      };

      api.sendMessage(sendAudio, threadID, () => {
        // Cleanup Files
        if (hasImage && fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        if (loadingMsg) api.unsendMessage(loadingMsg.messageID);
      });
    }, messageID);

  } catch (error) {
    console.error("Spotify Command Error:", error);
    const msg = error.response?.data?.message || error.message || "Unknown Error";
    if (loadingMsg) api.unsendMessage(loadingMsg.messageID);
    return api.sendMessage(`❌ 𝚃𝚛𝚊𝚌𝚔𝚒𝚗𝚐 𝙴𝚛𝚛𝚘𝚛: ${msg}`, threadID, messageID);
  }
};
