# 📚 Learning Tracker

A full-stack web application to track your daily learning goals, sessions, skills, and content — all in one place.

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat&logo=mongodb)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat&logo=tailwind-css)

---

## ✨ Features

- 🔐 **User Authentication** — Secure login & signup with JWT + bcrypt
- 📅 **Session Tracking** — Log and review your daily learning sessions
- 🧠 **Skill Management** — Add and track skills you're learning
- 📖 **Content Library** — Save books, videos, articles, and courses
- 📊 **Progress Dashboard** — Visual charts powered by Recharts
- 🌙 **Dark Mode** — Clean, modern UI with theme support
- 📱 **Responsive Design** — Works on all screen sizes

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI Framework |
| Vite | Build Tool & Dev Server |
| Tailwind CSS | Styling |
| Radix UI | Accessible Component Primitives |
| Recharts | Data Visualization |
| React Hook Form + Zod | Form Handling & Validation |
| Axios | HTTP Client |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API Server |
| MongoDB + Mongoose | Database & ODM |
| JWT | Authentication Tokens |
| bcryptjs | Password Hashing |
| dotenv | Environment Config |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

### 1. Clone the Repository
```bash
git clone https://github.com/HappyComit/Learning-tracker.git
cd Learning-tracker
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5000
```

### 4. Run the App
```bash
npm run dev
```

This starts both the **backend server** (port 5000) and the **frontend** (port 5173) concurrently.

Open your browser at: `http://localhost:5173`

---

## 📁 Project Structure

```
learning-tracker/
├── server/
│   ├── middleware/      # Auth middleware
│   ├── models/          # Mongoose models (User, Session, Skill, Content)
│   ├── routes/          # Express API routes
│   └── server.js        # Express app entry point
├── src/
│   ├── service/         # API service layer
│   ├── App.jsx          # Main React app
│   └── main.jsx         # React entry point
├── public/
├── .env                 # Environment variables (not committed)
└── package.json
```

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Run frontend + backend concurrently |
| `npm run client` | Run only the Vite frontend |
| `npm run server` | Run only the Node.js backend |
| `npm run build` | Build for production |
| `npm run lint` | Lint the codebase |

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
