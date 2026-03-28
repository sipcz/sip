import express from "express";
import axios from "axios";
import { promises as fs } from "fs"; 

const router = express.Router();

const BOT_TOKEN = "8381037035:AAGhfS8LbZQCgPf_oAVyvG9tXDLtfAxGVug";
const CHAT_ID = "8257665442";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pedro2026";
const LOG_FILE = "./taxi-log.json";

// Ініціалізація файлу логів
async function initLogs() {
    try {
        await fs.access(LOG_FILE);
    } catch {
        await fs.writeFile(LOG_FILE, "[]");
    }
}
initLogs();

// Отримуємо реальний IP клієнта
router.use((req, res, next) => {
    req.realIp = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress || req.ip;
    next();
});

const WHITELIST = new Set(["::1", "127.0.0.1"]);
const BLOCKED = new Map();
const RATE_LIMIT_IP = new Map();

// 1. КЛІЄНТ ЗАМОВЛЯЄ ТАКСІ
router.post("/", async (req, res) => {
    const { name, phone, address, comment, antibot, expected, secret } = req.body;
    const ip = req.realIp;
    const now = Date.now();
    const isWhitelisted = WHITELIST.has(ip);

    // ТВІЙ ЗАХИСТ ВІД БОТІВ
    if (!isWhitelisted) {
        if (!antibot || antibot.toUpperCase() !== (expected || "").toUpperCase()) {
            return res.status(400).send("Помилка: Неправильний код антибота.");
        }
        if (BLOCKED.has(ip) && now < BLOCKED.get(ip)) {
            return res.status(403).send("Ви заблоковані за спам. Спробуйте пізніше.");
        }
        if (secret) return res.status(400).send("Bot detected");
        if (RATE_LIMIT_IP.has(ip) && now - RATE_LIMIT_IP.get(ip) < 30000) {
            return res.status(429).send("Занадто часто! Почекайте 30 секунд.");
        }
    }

    try {
        // ЗБЕРЕЖЕННЯ У ФАЙЛ taxi-log.json
        const fileData = await fs.readFile(LOG_FILE, "utf-8");
        const logs = JSON.parse(fileData);
        
        // Створюємо заявку з унікальним _id (щоб адмінка могла видаляти)
        const newRequest = { 
            _id: Date.now().toString(), // Унікальний номер
            time: new Date().toLocaleString(), 
            name, phone, address, comment, ip 
        };
        
        logs.push(newRequest);
        await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2));

        // ВІДПРАВКА В TELEGRAM
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

// 2. АДМІН ОТРИМУЄ СПИСОК
router.get("/admin", async (req, res) => {
    if (req.query.pass !== ADMIN_PASSWORD) return res.status(403).json({ error: "Невірний пароль" });
    
    try {
        const fileData = await fs.readFile(LOG_FILE, "utf-8");
        let logs = JSON.parse(fileData);
        logs = logs.reverse(); // Нові заявки будуть зверху
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: "Помилка читання файлу" });
    }
});

// 3. АДМІН ВИДАЛЯЄ ЗАЯВКУ
router.post("/delete", async (req, res) => {
    const { pass, id } = req.body;
    
    if (pass !== ADMIN_PASSWORD) return res.status(403).send("Доступ заборонено");

    try {
        const fileData = await fs.readFile(LOG_FILE, "utf-8");
        let logs = JSON.parse(fileData);
        
        // Залишаємо тільки ті заявки, _id яких НЕ збігається з тим, що ми видаляємо
        logs = logs.filter(req => req._id !== id);
        
        await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2));
        res.send("Замовлення видалено!");
    } catch (error) {
        res.status(500).send("Помилка видалення");
    }
});

export default router;
