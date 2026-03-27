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
app.use("/api/taxi", taxiRoute); // ← ТЕПЕР ПРАВИЛЬНО

// 4. Запускаємо сервер
app.listen(3000, () => {
    console.log("Server running on port 3000");
    setInterval(() => {
    fetch("https://sip-lo83.onrender.com/")
        .then(() => console.log("Keep-alive ping"))
        .catch(() => console.log("Ping failed"));
}, 5 * 60 * 1000); // кожні 5 хвилин
});
