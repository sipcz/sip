import express from "express";
import axios from "axios";
import { promises as fs } from "fs"; // Асинхронний FS

const router = express.Router();

const BOT_TOKEN = "8381037035:AAGhfS8LbZQCgPf_oAVyvG9tXDLtfAxGVug";
const CHAT_ID = "8257665442";
const ADMIN_PASSWORD = "pedro2026";
const LOG_FILE = "./taxi-log.json";

// Ініціалізація логів
async function initLogs() {
    try {
        await fs.access(LOG_FILE);
    } catch {
        await fs.writeFile(LOG_FILE, "[]");
    }
}
initLogs();

// Мідлвера IP
router.use((req, res, next) => {
    req.realIp = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.ip;
    next();
});

const WHITELIST = new Set(["::1", "127.0.0.1"]);
const BLOCKED = new Map();
const ATTEMPTS = new Map();
const RATE_LIMIT_IP = new Map();

// Основний роут
router.post("/", async (req, res) => {
    const { name, phone, address, comment, antibot, expected, secret } = req.body;
    const ip = req.realIp;
    const now = Date.now();
    const isWhitelisted = WHITELIST.has(ip);

    if (!isWhitelisted) {
        // 1. Антибот
        if (!antibot || antibot.toUpperCase() !== (expected || "").toUpperCase()) {
            return res.status(400).send("Помилка: Неправильний код антибота.");
        }

        // 2. Блокування IP
        if (BLOCKED.has(ip) && now < BLOCKED.get(ip)) {
            return res.status(403).send("Ви заблоковані за спам. Спробуйте пізніше.");
        }

        // 3. Honeypot (приховане поле secret)
        if (secret) return res.status(400).send("Bot detected");

        // 4. Rate Limit (30 сек)
        if (RATE_LIMIT_IP.has(ip) && now - RATE_LIMIT_IP.get(ip) < 30000) {
            return res.status(429).send("Занадто часто! Почекайте 30 секунд.");
        }
    }

    try {
        // Запис логів (Асинхронно)
        const fileData = await fs.readFile(LOG_FILE, "utf-8");
        const logs = JSON.parse(fileData);
        logs.push({ time: new Date().toLocaleString(), name, phone, address, comment, ip });
        await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2));

        // Telegram
        const text = `🚕 *Новий виклик!*\n\n👤 Ім'я: ${name}\n📞 Тел: ${phone}\n📍 Адреса: ${address}\n💬 Коментар: ${comment || "-"}\n\n🌐 IP: ${ip}`;
        
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text,
            parse_mode: "Markdown"
        });

        RATE_LIMIT_IP.set(ip, now);
        res.send("Таксі успішно викликано! 🚕");

    } catch (err) {
        console.error("Помилка:", err.message);
        res.status(500).send("Помилка сервера. Спробуйте ще раз.");
    }
});

// Адмін-панель
router.get("/admin", async (req, res) => {
    if (req.query.pass !== ADMIN_PASSWORD) return res.status(403).send("Доступ заборонено");
    const logs = await fs.readFile(LOG_FILE, "utf-8");
    res.json(JSON.parse(logs));
});

export default router;
