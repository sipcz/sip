function toggleTheme() {
    document.body.classList.toggle("light-theme");
}

async function renderCatalog() {
    const res = await fetch("/api/cars");
    const cars = await res.json();

    const container = document.getElementById("carList");
    container.innerHTML = "";

    cars.forEach(car => {
        container.innerHTML += `
            <div class="car-card" data-brand="${car.brand}" data-year="${car.year}" data-price="${car.price}">
                <img src="${car.img}">
                <h3>${car.name}</h3>
                <p class="price">${car.price} €</p>
            </div>
        `;
    });
}

renderCatalog();