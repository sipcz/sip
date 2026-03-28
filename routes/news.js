const fs = require('fs');

const newsDataFile = 'news-data.json';

// News data structure
let newsData = [];

// Load existing news data
if (fs.existsSync(newsDataFile)) {
    const data = fs.readFileSync(newsDataFile);
    newsData = JSON.parse(data);
}

// Helper function to save news data
const saveNewsData = () => {
    fs.writeFileSync(newsDataFile, JSON.stringify(newsData, null, 2));
};

// Get public news
const getPublicNews = (req, res) => {
    res.json(newsData);
};

// Add news with password protection
const addNews = (req, res) => {
    const { title, category, content, date, password } = req.body;
    if (password !== 'your_secret_password') {
        return res.status(403).json({ message: 'Forbidden' });
    }
    const newNews = { title, category, content, date };
    newsData.push(newNews);
    saveNewsData();
    res.status(201).json(newNews);
};

// Delete news
const deleteNews = (req, res) => {
    const { title } = req.body;
    newsData = newsData.filter(news => news.title !== title);
    saveNewsData();
    res.status(204).send();
};

module.exports = {
    getPublicNews,
    addNews,
    deleteNews,
};
