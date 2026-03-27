export default function checkAuth(req, res, next) {
    const token = req.headers.authorization;

    if (token !== "admin-token") {
        return res.status(401).json({ error: "Unauthorized" });
    }

    next();
}