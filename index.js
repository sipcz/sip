import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import taxiRouter from "./routes/taxi.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Парсимо JSON
app.use(express.json());

// Віддаємо статичні файли
app.use(express.static(path.join(__dirname, "public")));

// API маршрут таксі
app.use("/api/taxi", taxiRouter);

// Всі інші маршрути → index.html
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Порт для Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
