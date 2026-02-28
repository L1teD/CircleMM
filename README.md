# CircleMM

**Advanced competitive platform for osu! with seamless match management**

CircleMM is a modern distributed system for searching and running Elo-based matches, designed specifically for osu! players. It combines advanced match-management logic, Discord integration, and unique features not found in competing platforms.

---

## ⚡ Key Features

- **Lobby & Queue System**  
  Players join a queue with priority given to those who have been waiting longer. The longer you wait, the wider your Elo window for match search.

- **Elo-based Matches with Flexible Control**  
  Two bots manage matches simultaneously: maps can be banned/picked either directly in-game or via Discord buttons.

- **WebSocket API**  
  Full support for match tracking by ID.

- **OAuth2 Account Linking**  
  Unique authorization system allowing osu! accounts to be linked to the platform.

- **Match Recovery after Bot Restart**  
  Reliability and minimal data loss in case of failures.

- **Discord Interactions**  
  Full UX integration via buttons and interactive elements, instead of slash commands.

---

## 🛠 Technology Stack

- **Backend/API:** Fastify (WebSocket in development)
- **Frontend:** Next.js (in development)  
- **Discord Bot:** discord.js  
- **osu! Bot:** bancho.js / osu-api-v2-js  
- **Storage:** MySQL + Redis  

> Distributed architecture :NOWAY:

---

## 🚀 Competitive Advantages

- Clean and modular code — match logic is centralized and maintainable.  
- UX via Discord Interactions — matches are easier and faster to manage.  
- Match recovery after restarts and unique account linking approach.  
- Fully open-source under **AGPLv3**.
