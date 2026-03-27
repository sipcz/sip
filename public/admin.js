console.log("ADMIN JS LOADED");

async function login() {
    console.log("LOGIN CLICKED");

    const password = document.getElementById("adminPass").value;

    let res;

    try {
        res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });
    } catch (e) {
        alert("Помилка з'єднання з сервером");
        return;
    }

    // Блокування після 5 спроб
    if (res.status === 429) {
        let err;
        try {
            err = await res.json();
        } catch {
            err = { message: "Забагато спроб. Заблоковано на 1 хвилину." };
        }
        alert(err.message);
        return;
    }

    // Невірний пароль
    if (res.status === 401) {
        alert("Невірний пароль");
        return;
    }

    // Інші помилки
    if (!res.ok) {
        alert("Помилка сервера");
        return;
    }

    // Успіх
const data = await res.json();
localStorage.setItem("token", data.token);

document.getElementById("loginBox").style.display = "none";
document.getElementById("adminPanel").style.display = "block";

// ⬇️ Ось тут викликаємо завантаження авто
loadCars();
}



function logout() {
    localStorage.removeItem("token");
    location.reload();
}
async function loadCars() {
    const token = localStorage.getItem("token");

    const res = await fetch("/api/cars", {
        headers: { "Authorization": token }
    });

    if (!res.ok) {
        console.log("LOAD ERROR:", res.status);
        return;
    }

    const cars = await res.json();

    const list = document.getElementById("adminCarList");
    list.innerHTML = "";

    cars.forEach(car => {
        const div = document.createElement("div");
        div.className = "car-item";
        div.innerHTML = `
            <h3>${car.name}</h3>
            <p>${car.brand}, ${car.year}</p>
            <p>Ціна: ${car.price}€</p>
            <img src="${car.img}" width="200">
            <br>
            <button onclick="deleteCar('${car.id}')">Видалити</button>
        `;
        list.appendChild(div);
    });
}

async function addCar() {
    const token = localStorage.getItem("token");

    const car = {
        name: document.getElementById("carName").value,
        brand: document.getElementById("carBrand").value,
        year: document.getElementById("carYear").value,
        price: document.getElementById("carPrice").value,
        img: document.getElementById("carImg").value
    };

    const res = await fetch("/api/cars", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": token
        },
        body: JSON.stringify(car)
    });

    if (res.ok) {
        loadCars();
    }
}

async function deleteCar(id) {
    const token = localStorage.getItem("token");

    await fetch(`/api/cars/${id}`, {
        method: "DELETE",
        headers: { "Authorization": token }
    });

    loadCars();
}