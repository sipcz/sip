import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import taxiRouter from "./routes/taxi.js";
import https from "https"; // Додаємо цей модуль

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API маршрут таксі
app.use("/api/taxi", taxiRouter);

// Всі інші маршрути → index.html
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ПОРТ
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port", PORT);

    // --- ФУНКЦІЯ ПРОТИ СНУ (SELF-PING) ---
    const URL = "https://sip-lo83.onrender.com"; // Твоє посилання
    setInterval(() => {
        https.get(URL, (res) => {
            console.log(`Self-ping status: ${res.statusCode}`);
        }).on('error', (e) => {
            console.error(`Ping error: ${e.message}`);
        });
    }, 10 * 60 * 1000); // 10 хвилин (600,000 мс)
    // ------------------------------------
});
