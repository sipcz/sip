import express from "express";
import axios from "axios";

const router = express.Router();

const BOT_TOKEN = "8381037035:AAGhfS8LbZQCgPf_oAVyvG9tXDLtfAxGVug";
const CHAT_ID = "8257665442";

router.post("/", async (req, res) => {
    const { name, phone, address, comment } = req.body;

    const text = `
🚕 *Новий виклик таксі!*

👤 Ім'я: ${name}
📞 Телефон: ${phone}
📍 Адреса: ${address}
💬 Коментар: ${comment || "немає"}
    `;

    try {
        await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            {
                chat_id: CHAT_ID,
                text: text,
                parse_mode: "Markdown"
            }
        );

        res.send("Таксі успішно викликано! Ми вже їдемо 🚕");
    } catch (err) {
        console.log(err);
        res.status(500).send("Помилка при відправці повідомлення");
    }
});

export default router;