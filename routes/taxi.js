import express from "express";
import axios from "axios";
import fs from "fs";

const router = express.Router();

const BOT_TOKEN = "8381037035:AAGhfS8LbZQCgPf_oAVyvG9tXDLtfAxGVug";
const CHAT_ID = "8257665442";
const ADMIN_PASSWORD = "pedro2026";

// ===== МІДЛВЕРА ДЛЯ ПРАВИЛЬНОГО IP =====
router.use((req, res, next) => {
    req.realIp =
        req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
        req.connection.remoteAddress ||
        req.ip;

    next();
});

// ===== АНТИСПАМ =====

// Whitelist — твої IP ніколи не блокуються
const WHITELIST = new Set([
    "::1",
    "127.0.0.1",
]);

// Ліміти
const RATE_LIMIT_IP = new Map();      // IP → timestamp
const RATE_LIMIT_PHONE = new Map();   // phone → timestamp
const BLOCKED = new Map();            // IP → blockUntil timestamp
const ATTEMPTS = new Map();           // IP → count

// Налаштування
const BLOCK_TIME = 5 * 60 * 1000;     // 5 хвилин
const IP_DELAY = 30 * 1000;           // 30 сек
const PHONE_DELAY = 60 * 1000;        // 60 сек
const MAX_ATTEMPTS = 5;               // після 5 спроб — блок

// ===== ЛОГИ =====

const LOG_FILE = "./taxi-log.json";

if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, "[]");
}

// ===== ОСНОВНИЙ МАРШРУТ =====

router.post("/", async (req, res) => {
    const { name, phone, address, comment, secret, antibot } = req.body;
    const ip = req.realIp;
    const now = Date.now();

    // 0. Антибот — 2 букви
    if (!antibot || antibot.toUpperCase() !== "AB") {
        return res.status(400).send("Антибот: введіть правильні 2 букви.");
    }

    // 0.5 Whitelist
    if (!WHITELIST.has(ip)) {

        // 1. Перевірка блокування
        if (BLOCKED.has(ip)) {
            const until = BLOCKED.get(ip);
            if (now < until) {
                return res.status(403).send("Ваш IP тимчасово заблоковано за спам.");
            } else {
                BLOCKED.delete(ip);
                ATTEMPTS.delete(ip);
            }
        }

        // 2. Honeypot
        if (secret && secret.trim() !== "") {
            return res.status(400).send("Бот заблокований");
        }

        // 3. Rate limit по IP
        if (RATE_LIMIT_IP.has(ip) && now - RATE_LIMIT_IP.get(ip) < IP_DELAY) {
            return res.status(429).send("Занадто часто! Спробуйте через 30 секунд.");
        }
        RATE_LIMIT_IP.set(ip, now);

        // 4. Rate limit по телефону
        if (RATE_LIMIT_PHONE.has(phone) && now - RATE_LIMIT_PHONE.get(phone) < PHONE_DELAY) {
            return res.status(429).send("Ви вже викликали таксі. Спробуйте через хвилину.");
        }
        RATE_LIMIT_PHONE.set(phone, now);

        // 5. Лічильник спроб
        const count = (ATTEMPTS.get(ip) || 0) + 1;
        ATTEMPTS.set(ip, count);

        if (count >= MAX_ATTEMPTS) {
            BLOCKED.set(ip, now + BLOCK_TIME);
            ATTEMPTS.delete(ip);
            return res.status(403).send("Ваш IP тимчасово заблоковано за спам.");
        }
    }

    // ===== ЗБЕРЕЖЕННЯ ЛОГА =====

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

    // ===== ВІДПРАВКА В TELEGRAM =====

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

// ===== АДМІН-ПАНЕЛЬ =====

router.get("/admin", (req, res) => {
    const pass = req.query.pass;

    if (pass !== ADMIN_PASSWORD) {
        return res.status(403).send("Доступ заборонено");
    }

    const logs = JSON.parse(fs.readFileSync(LOG_FILE));
    res.json(logs);
});

// ===== ВИДАЛЕННЯ ЗАЯВКИ =====

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
