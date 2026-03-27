import bcrypt from "bcryptjs";

const password = "pedro2026";

const hash = bcrypt.hashSync(password, 10);

console.log("HASH:", hash);