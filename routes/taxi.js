import express from "express";
import axios from "axios";
import fs from "fs";

const router = express.Router();

const BOT_TOKEN = "8381037035:AAGhfS8LbZQCgPf_oAVyvG9tXDLtfAxGVug";
const CHAT_ID = "8257665442";
const ADMIN_PASSWORD = "pedro2026"; // зміни на свій

// Антиспам карти
const ipLimit = new Map();
const phoneLimit = new Map();
const blockedIPs = new Map(); // IP → час блокування

// Файл для логів
const LOG_FILE = "./taxi-log.json";

// Створюємо файл, якщо його немає
if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, "[]");
}

router.post("/", async (req, res) => {
    const { name, phone, address, comment, secret } = req.body;

    const now = Date.now();
    const ip = req.ip;

    // 🛡️ 0. Перевірка блокування IP
    if (blockedIPs.has(ip)) {
        const blockTime = blockedIPs.get(ip);

        if (now - blockTime < 300000) {
            return res.status(403).send("Ваш IP тимчасово заблоковано за спам.");
        } else {
            blockedIPs.delete(ip);
        }
    }

    // 🛡️ 1. Антибот (honeypot)
    if (secret && secret.trim() !== "") {
        console.log("Бот заблокований:", ip);
        return res.status(400).send("Бот заблокований");
    }

    // 🛡️ 2. Антиспам по IP (30 сек)
    if (ipLimit.has(ip) && now - ipLimit.get(ip) < 300000) {
        return res.status(429).send("Занадто часто! Спробуйте через 30 секунд.");
    }
    ipLimit.set(ip, now);

    // 🛡️ 3. Антиспам по телефону (60 сек)
    if (phoneLimit.has(phone) && now - phoneLimit.get(phone) < 60000) {
        return res.status(429).send("Ви вже викликали таксі. Спробуйте через хвилину.");
    }
    phoneLimit.set(phone, now);

    // 🛡️ 4. Лічильник спроб для блокування IP
    if (!blockedIPs.has(ip + "_count")) {
        blockedIPs.set(ip + "_count", 0);
    }

    let attempts = blockedIPs.get(ip + "_count");
    attempts++;

    if (attempts >= 5) {
        blockedIPs.set(ip, now);
        blockedIPs.delete(ip + "_count");
        console.log("IP заблоковано на 24 години:", ip);
        return res.status(403).send("Ваш IP заблоковано за спам.");
    }

    blockedIPs.set(ip + "_count", attempts);

    // 📝 5. Збереження заявки у файл
    const logEntry = {
        time: new Date().toISOString(),
        name,
        phone,
        address,
        comment,
        ip
    };

    const logs = JSON.parse(fs.readFileSync(LOG_FILE));
    logs.push(logEntry);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));

    // 📩 6. Повідомлення в Telegram
    const text = `
🚕 *Новий виклик таксі!*

👤 Ім'я: ${name}
📞 Телефон: ${phone}
📍 Адреса: ${address}
💬 Коментар: ${comment || "немає"}

IP: ${ip}
    `;

    try {
        await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            {
                chat_id: CHAT_ID,
                text,
                parse_mode: "Markdown"
            }
        );

        res.send("Таксі успішно викликано! Ми вже їдемо 🚕");
    } catch (err) {
        console.log(err);
        res.status(500).send("Помилка при відправці повідомлення");
    }
});

// 🛡️ 7. Адмін‑панель (JSON API)
router.get("/admin", (req, res) => {
    const pass = req.query.pass;

    if (pass !== ADMIN_PASSWORD) {
        return res.status(403).send("Доступ заборонено");
    }

    const logs = JSON.parse(fs.readFileSync(LOG_FILE));
    res.json(logs);
});

// 🗑 Видалення заявки
router.post("/delete", (req, res) => {
    const { pass, index } = req.body;

    if (pass !== ADMIN_PASSWORD) {
        return res.status(403).send("Доступ заборонено");
    }

    const logs = JSON.parse(fs.readFileSync(LOG_FILE));

    if (index < 0 || index >= logs.length) {
        return res.status(400).send("Невірний індекс");
    }

    logs.splice(index, 1);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));

    res.send("Заявку видалено");
});

export default router;
