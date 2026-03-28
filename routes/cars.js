import express from "express";

const router = express.Router();

// Пароль адміністратора (з Render або стандартний)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "pedro2026";

// Тимчасова база даних у памʼяті
let cars = [
    {
        name: "M5",
        brand: "BMW",
        year: 2020,
        price: 55000,
        img: "assets/img/car1.jpg"
    },
    {
        name: "RS7",
        brand: "Audi",
        year: 2021,
        price: 72000,
        img: "assets/img/car2.jpg"
    }
];

// 1. Публічний маршрут (БЕЗ ПАРОЛЯ) — для головної сторінки та адмінки (щоб бачити список)
router.get("/public", (req, res) => {
    res.json(cars);
});

// 2. ДОДАТИ АВТО (ЗАХИЩЕНО ПАРОЛЕМ)
router.post("/add", (req, res) => {
    const { pass, car } = req.body;

    // Перевірка пароля
    if (pass !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: "Доступ заборонено! Невірний пароль." });
    }

    if (!car || !car.name || !car.price) {
        return res.status(400).json({ error: "Неповні дані авто." });
    }

    // Додаємо авто в масив
    cars.push(car);
    res.json({ success: true, message: "Авто успішно додано!" });
});

// 3. ВИДАЛИТИ АВТО (ЗАХИЩЕНО ПАРОЛЕМ)
router.post("/delete", (req, res) => {
    const { pass, index } = req.body;

    // Перевірка пароля
    if (pass !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: "Доступ заборонено! Невірний пароль." });
    }

    // Перевірка, чи існує авто з таким індексом
    if (index === undefined || index < 0 || index >= cars.length) {
        return res.status(400).json({ error: "Авто не знайдено." });
    }

    // Видаляємо авто з масиву
    cars.splice(index, 1);
    res.json({ success: true, message: "Авто видалено!" });
});

export default router;
