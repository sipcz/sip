import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import carsRoutes from "./routes/cars.js";
import taxiRoute from "./routes/taxi.js";

// 1. Створюємо app
const app = express();

// 2. Підключаємо middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use(express.static("assets"));

// 3. Підключаємо маршрути
app.use("/api/auth", authRoutes);
app.use("/api/cars", carsRoutes);
app.use("/api/taxi", taxiRoute);

// =======================================================
// 🛡️ ЗАХИСТ АДМІНКИ ВІД БОТІВ (RATE LIMITING)
// =======================================================
const ADMIN_ATTEMPTS = new Map();
const ADMIN_BLOCKED = new Map();
const ADMIN_BLOCK_TIME = 60 * 60 * 1000; // 1 година в мілісекундах
const MAX_ADMIN_ATTEMPTS = 5;

// Беремо пароль з налаштувань Render, або ставимо pedro2026 за замовчуванням
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pedro2026";

app.post('/api/admin/login', (req, res) => {
    // Отримуємо реальний IP користувача (працює на Render)
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    const { pass } = req.body;
    const now = Date.now();

    // 1. Чи не заблокований цей IP?
    if (ADMIN_BLOCKED.has(ip)) {
        const until = ADMIN_BLOCKED.get(ip);
        if (now < until) {
            const minutesLeft = Math.ceil((until - now) / 60000);
            return res.status(403).json({ error: `Ваш IP заблоковано! Спробуйте через ${minutesLeft} хв.` });
        } else {
            ADMIN_BLOCKED.delete(ip);
            ADMIN_ATTEMPTS.delete(ip);
        }
    }

    // 2. Перевірка пароля
    if (pass === ADMIN_PASSWORD) {
        ADMIN_ATTEMPTS.delete(ip); // Скидаємо лічильник помилок
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

// 4. Запускаємо сервер (Виправлено для Render)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Самопінг, щоб Render не засинав
    setInterval(() => {
        fetch("https://sip-lo83.onrender.com/")
            .then(() => console.log("Keep-alive ping success"))
            .catch(() => console.log("Ping failed"));
    }, 5 * 60 * 1000); // кожні 5 хвилин
});
