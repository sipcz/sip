import express from "express";
import axios from "axios";
import mongoose from "mongoose"; // Підключаємо базу даних

const router = express.Router();

const BOT_TOKEN = "8381037035:AAGhfS8LbZQCgPf_oAVyvG9tXDLtfAxGVug";
const CHAT_ID = "8257665442";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pedro2026";

// 1. Схема бази даних для таксі
const taxiSchema = new mongoose.Schema({
    name: String,
    phone: String,
    address: String,
    comment: String,
    time: String,
    ip: String
});
const Taxi = mongoose.model("Taxi", taxiSchema);

// Мідлвера IP (залишаємо твою)
router.use((req, res, next) => {
    req.realIp = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress || req.ip;
    next();
});

const WHITELIST = new Set(["::1", "127.0.0.1"]);
const BLOCKED = new Map();
const RATE_LIMIT_IP = new Map();

// Основний роут (Виклик таксі)
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
        // ЗБЕРЕЖЕННЯ В MONGODB (замість файлу json)
        const time = new Date().toLocaleString();
        const newRequest = new Taxi({ name, phone, address, comment, time, ip });
        await newRequest.save();

        // TELEGRAM (залишаємо твій)
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

// Адмін-панель: Отримати всі заявки
router.get("/admin", async (req, res) => {
    if (req.query.pass !== ADMIN_PASSWORD) return res.status(403).send("Доступ заборонено");
    
    try {
        const requests = await Taxi.find().sort({ _id: -1 }); // Нові зверху
        res.json(requests);
    } catch (error) {
        res.status(500).send("Помилка завантаження бази");
    }
});

// Адмін-панель: Видалити заявку (перероблено під MongoDB ID)
router.post("/delete", async (req, res) => {
    const { pass, id } = req.body;
    
    if (pass !== ADMIN_PASSWORD) return res.status(403).send("Доступ заборонено");

    try {
        await Taxi.findByIdAndDelete(id);
        res.send("Замовлення видалено!");
    } catch (error) {
        res.status(500).send("Помилка видалення");
    }
});

export default router;
