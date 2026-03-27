import express from "express";
import bcrypt from "bcryptjs";

const router = express.Router();

// Хеш пароля "pedro2026"
const HASHED_PASSWORD = "$2b$10$fIDlUU4KhnzpNeSYzJNEGuy1qSxEOobp0sy7XArlgQBRL.ez8fNT6";

router.post("/login", async (req, res) => {
    const { password } = req.body;

    try {
        const isMatch = await bcrypt.compare(password, HASHED_PASSWORD);

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid password" });
        }

        const token = "admin-token";
        res.json({ token });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;