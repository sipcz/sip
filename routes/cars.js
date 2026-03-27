import express from "express";
import checkAuth from "../middleware/checkAuth.js";

const router = express.Router();

// Тимчасова база даних у памʼяті
let cars = [
    {
        id: "1",
        name: "BMW M5",
        brand: "BMW",
        year: 2020,
        price: 55000,
        img: "assets/img/car1.jpg"
    },
    {
        id: "2",
        name: "Audi RS7",
        brand: "Audi",
        year: 2021,
        price: 72000,
        img: "assets/img/car2.jpg"
    }
];

// GET — отримати всі авто
router.get("/", checkAuth, (req, res) => {
    res.json(cars);
});

// POST — додати авто
router.post("/", checkAuth, (req, res) => {
    const { name, brand, year, price, img } = req.body;

    const newCar = {
        id: Date.now().toString(),
        name,
        brand,
        year,
        price,
        img
    };

    cars.push(newCar);
    res.json({ success: true, car: newCar });
});

// DELETE — видалити авто
router.delete("/:id", checkAuth, (req, res) => {
    const { id } = req.params;

    cars = cars.filter(car => car.id !== id);

    res.json({ success: true });
});

// Публічний маршрут для сайту (без авторизації)
router.get("/public", (req, res) => {
    res.json(cars);
});


export default router;