# 🚀 Daily Tracker — Full-Stack Wellness & Habit Engine

[![Live App](https://img.shields.io/badge/Live%20Demo-Render-brightgreen?style=for-the-badge&logo=render)](https://daily-tracker-y6nz.onrender.com)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org)
[![SQLite](https://img.shields.io/badge/Database-SQLite3-003B57?style=for-the-badge&logo=sqlite)](https://sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

A high-performance, full-stack Progressive Web Application (PWA) designed to track daily habits, manage tasks, boost deep focus, break digital addiction, and provide AI-like heuristic wellness insights.

🌐 **Live Application URL**: [https://daily-tracker-y6nz.onrender.com](https://daily-tracker-y6nz.onrender.com)

---

## 🌟 Key Features

### ⚡ Dopamine Detox Shield & Doomscroll Counter
* **What it does**: Locks down your dashboard into a high-intensity detox sprint to break phone and social media addiction.
* **Live Tickers**: Real-time counter of estimated **doomscroll time saved** and **dopamine reset points**.
* **Custom Durations**: Choose preset durations (15m, 30m, 45m, 60m, 90m) or set custom sprint lengths (1 to 180 mins).
* **Fullscreen Lockout Mode**: Expands into an ambient focus lockout screen to eliminate all digital distractions.

### 🧠 Wellness Heuristic Health Coach
* **Intelligent Habit Analysis**: Analyzes rolling 7-day logs for sleep debt, hydration streaks, workout frequency, and screen time overages.
* **Mind-Body Sync**: Correlates low sleep with reported mood states (Tired, Stressed) and generates actionable health recommendations.

### 📺 Fullscreen Distraction-Free "Lounge Mode"
* **Aesthetic Focus Space**: Expands your Pomodoro session into a 96px glowing timer with ambient mindset quotes and built-in lofi audio track selection.

### 🧘 Guided Box-Breathing Visualizer
* **Science-Backed Patterns**: Interactive breathing guides including **Box Breathing (4-4-4-4)**, **4-7-8 Deep Sleep**, and **Coherent Calm (5-0-5-0)**.
* **Web Audio Synthesizer**: Generates smooth frequency audio sweeps that expand and contract with the visual breath ring.

### 🌅 Dynamic Sky & Constellation Engine
* **Real-Time Environment Shifts**: Automatically shifts background themes based on local time:
  * **Morning (6 AM - 11 AM)**: Golden Sunrise glow 🌅
  * **Afternoon (11 AM - 5 PM)**: Cyber Cyan ☀️
  * **Sunset (5 PM - 8 PM)**: Deep Purple & Violet dusk 🌆
  * **Night (8 PM - 6 AM)**: Cosmic space starfield with 45 twinkling stars 🌌

### 📅 GitHub-Style "Year in Pixels" Heatmap
* **365-Day Interactive Grid**: Visualizes your daily habit completion rate across a full year grid with custom hover tooltips detailing logged stats.

### 📋 Kanban Task Board
* **Category Drag & Drop**: Organize tasks across **Work 💼**, **Health 🏃‍♂️**, **Personal 👤**, and **Other 🏷️** in To Do, In Progress, and Completed columns.

### 🔐 Multi-User Cloud Sync & Google OAuth
* **Secure Authentication**: Traditional Username/Password & passwordless **Google / Gmail OAuth Sign-In**.
* **Cloud SQLite Storage**: Synchronizes entries, custom goals, notes, and tasks to SQLite (`tracker.db`) with automatic offline fallback to `localStorage`.

---

## 🛠️ Technology Stack

### **Frontend**
* **Core**: HTML5, Vanilla JavaScript (ES6+ Modules), Glassmorphic CSS3 Design System.
* **Typography**: Google Fonts (`Outfit` & `Plus Jakarta Sans`).
* **Audio Engine**: HTML5 Audio Element & Web Audio API Synthesizers.
* **Canvas FX**: HTML5 Canvas Particle Engine for celebratory confetti animations.

### **Backend**
* **Server**: Node.js & Express.js REST API.
* **Database**: SQLite3 (`tracker.db`) with automatic schema initialization.
* **Authentication**: JSON Web Tokens (JWT) & `bcryptjs` password hashing.
* **OAuth Integration**: Google Identity Services API.

---

## 🚀 Getting Started Locally

### Prerequisites
* [Node.js](https://nodejs.org/) (v16 or higher)
* `npm` package manager

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/daily-tracker.git
   cd daily-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open in browser**:
   Navigate to [http://localhost:5000](http://localhost:5000) or open `http://<LOCAL_IP>:5000` on your mobile device!

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Create a new user account |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT |
| `POST` | `/api/auth/google` | Google / Gmail OAuth Sign-In |
| `GET` | `/api/data/sync` | Fetch full user data (goals, logs, tasks, notes) |
| `POST` | `/api/data/entry` | Save daily habit entry & mood |
| `POST` | `/api/data/goals` | Save daily target goals |
| `POST` | `/api/data/tasks` | Sync Kanban tasks array |
| `POST` | `/api/data/notes` | Save daily reflections |
| `GET` | `/api/health` | Server health check endpoint |

---

## 📁 Folder Structure

```text
Daily tracker/
├── index.html            # Main HTML layout & modal overlays
├── style.css             # Glassmorphism CSS design system & animations
├── script.js             # Client-side UI logic, API sync, & audio engines
├── server.js            # Node.js & Express REST API server
├── db.js                # SQLite database setup & table migrations
├── package.json         # Node.js dependencies & npm scripts
├── tracker.db           # SQLite database file (ignored in git)
└── *.mp3                # High-quality ambient audio tracks
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
