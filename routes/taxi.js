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

// ===== АНТИСПАМ / WHITELIST =====

const WHITELIST = new Set([
    "::1",
    "127.0.0.1",
]);

const RATE_LIMIT_IP = new Map();
const RATE_LIMIT_PHONE = new Map();
const BLOCKED = new Map();
const ATTEMPTS = new Map();

const BLOCK_TIME = 5 * 60 * 1000;
const IP_DELAY = 30 * 1000;
const PHONE_DELAY = 60 * 1000;
const MAX_ATTEMPTS = 5;

// ===== ЛОГИ =====

const LOG_FILE = "./taxi-log.json";

if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, "[]");
}

// ===== СЕРВІСНИЙ МАРШРУТ ДЛЯ FRONTEND (чи в whitelist) =====

router.get("/check-ip", (req, res) => {
    const ip = req.realIp;
    res.json({ whitelisted: WHITELIST.has(ip) });
});

// ===== ОСНОВНИЙ МАРШРУТ =====

router.post("/", async (req, res) => {
    const { name, phone, address, comment, secret, antibot, expected } = req.body;
    const ip = req.realIp;
    const now = Date.now();

    // 0. Якщо IP у whitelist — пропускаємо антибот і антиспам
    const isWhitelisted = WHITELIST.has(ip);

    // 1. Антибот (тільки якщо не whitelist)
    if (!isWhitelisted) {
        if (!antibot || !expected || antibot.toUpperCase() !== expected.toUpperCase()) {
            return res.status(400).send("Антибот: неправильні букви.");
        }
    }

    // 2. Антиспам (тільки якщо не whitelist)
    if (!isWhitelisted) {
        if (BLOCKED.has(ip)) {
            const until = BLOCKED.get(ip);
            if (now < until) {
                return res.status(403).send("Ваш IP тимчасово заблоковано за спам.");
            } else {
                BLOCKED.delete(ip);
                ATTEMPTS.delete(ip);
            }
        }

        // Honeypot
        if (secret && secret.trim() !== "") {
            return res.status(400).send("Бот заблокований");
        }

        if (RATE_LIMIT_IP.has(ip) && now - RATE_LIMIT_IP.get(ip) < IP_DELAY) {
            return res.status(429).send("Занадто часто! Спробуйте через 30 секунд.");
        }
        RATE_LIMIT_IP.set(ip, now);

        if (RATE_LIMIT_PHONE.has(phone) && now - RATE_LIMIT_PHONE.get(phone) < PHONE_DELAY) {
            return res.status(429).send("Ви вже викликали таксі. Спробуйте через хвилину.");
        }
        RATE_LIMIT_PHONE.set(phone, now);

        const count = (ATTEMPTS.get(ip) || 0) + 1;
        ATTEMPTS.set(ip, count);

        if (count >= MAX_ATTEMPTS) {
            BLOCKED.set(ip, now + BLOCK_TIME);
            ATTEMPTS.delete(ip);
            return res.status(403).send("Ваш IP тимчасово заблоковано за спам.");
        }
    }

    // ===== ЛОГИ =====

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

    // ===== TELEGRAM =====

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
