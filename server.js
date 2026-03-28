import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import https from "https"; // Надійний модуль для пінгу

import authRoutes from "./routes/auth.js";
import carsRoutes from "./routes/cars.js";
import taxiRoute from "./routes/taxi.js";

// Налаштування шляхів (щоб сервер точно знаходив HTML файли)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "assets")));

// Маршрути API
app.use("/api/auth", authRoutes);
app.use("/api/cars", carsRoutes);
app.use("/api/taxi", taxiRoute);

// =======================================================
// 🛡️ ЗАХИСТ АДМІНКИ ВІД БОТІВ (RATE LIMITING)
// =======================================================
const ADMIN_ATTEMPTS = new Map();
const ADMIN_BLOCKED = new Map();
const ADMIN_BLOCK_TIME = 60 * 60 * 1000; // 1 година
const MAX_ADMIN_ATTEMPTS = 5;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pedro2026";

app.post('/api/admin/login', (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    const { pass } = req.body;
    const now = Date.now();

    if (ADMIN_BLOCKED.has(ip)) {
        const until = ADMIN_BLOCKED.get(ip);
        if (now < until) {
            const min = Math.ceil((until - now) / 60000);
            return res.status(403).json({ error: `IP заблоковано! Спробуйте через ${min} хв.` });
        } else {
            ADMIN_BLOCKED.delete(ip);
            ADMIN_ATTEMPTS.delete(ip);
        }
    }

    if (pass === ADMIN_PASSWORD) {
        ADMIN_ATTEMPTS.delete(ip);
        return res.json({ success: true });
    } else {
        const attempts = (ADMIN_ATTEMPTS.get(ip) || 0) + 1;
        ADMIN_ATTEMPTS.set(ip, attempts);

        if (attempts >= MAX_ADMIN_ATTEMPTS) {
            ADMIN_BLOCKED.set(ip, now + ADMIN_BLOCK_TIME);
            return res.status(403).json({ error: "Перевищено ліміт! Ваш IP заблоковано на 1 годину." });
        }
        return res.status(401).json({ error: `Невірний пароль! Залишилось спроб: ${MAX_ADMIN_ATTEMPTS - attempts}` });
    }
});
// =======================================================

// 🌐 МАРШРУТИ ДЛЯ СТОРІНОК
// Тепер адмінка точно відкриється за адресою твій-сайт.com/admin
app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Головна сторінка для всіх інших посилань
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🚀 ЗАПУСК СЕРВЕРА
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Самопінг (працює завжди, не крашить сервер)
    setInterval(() => {
        https.get("https://sip-lo83.onrender.com/", (res) => {
            console.log("Keep-alive ping OK:", res.statusCode);
        }).on("error", (err) => {
            console.log("Ping failed:", err.message);
        });
    }, 10 * 60 * 1000); // кожні 10 хвилин
});
