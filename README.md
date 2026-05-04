# 🚀 CampusCrate – Lost & Found System for University

![MERN](https://img.shields.io/badge/Stack-MERN-green)
![React](https://img.shields.io/badge/Frontend-React%20(Vite)-blue)
![Node](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-yellow)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen)
![Auth](https://img.shields.io/badge/Auth-Clerk%20%2B%20JWT-orange)
![Realtime](https://img.shields.io/badge/Realtime-Socket.IO-purple)
![Status](https://img.shields.io/badge/Status-Active-success)

---

## 📌 Overview

CampusCrate is a full-stack MERN application that enables students to **report, search, claim, and recover lost or found items** within a university campus.

It provides a **centralized, searchable, and real-time platform**, replacing unstructured systems like WhatsApp or Telegram.

---

## 🧩 Problem

- No centralized lost & found system  
- Messages get lost in chats  
- No verification mechanism  
- No proper tracking of item status  

---

## 🌟 Features

- 📌 Post Lost & Found Items  
- 🔍 Search & Filter Listings  
- 🔐 Claim Verification System  
- 💬 Real-time Chat (Socket.IO)  
- 🔔 Notifications (Push + In-app)  
- 🚫 Report & Block Users  
- 🛠 Admin Dashboard  
- ✅ Mark Items as Returned  
- 💾 Save Items  

---

## 🧑‍🤝‍🧑 Users

- **Student (Finder)** → Reports found items  
- **Student (Loser)** → Searches & claims items  
- **Admin** → Moderates platform  

---

## 🔁 User Flow

### 🧍‍♂️ 1. Lost Item Flow (User)

1. User logs in using **Clerk authentication**
2. Navigates to **“Report Item” → selects Lost**
3. Fills details:
   - Title, category, description
   - Tags, date, location
   - Optional image upload (ImageKit)
4. Searches existing **Found items**
5. If no match found → submits post
6. Item becomes visible on dashboard
7. Receives **notifications** when:
   - Someone sends a message
   - Someone submits a claim

---

### 🧍‍♀️ 2. Found Item Flow (User)

1. User logs in
2. Navigates to **“Report Item” → selects Found**
3. Submits item details (description, image, location)
4. System displays item in listings
5. Other users can:
   - View item
   - Send messages
   - Submit claims
6. Owner verifies and marks item as:
   - **Returned**

---

### 🔐 3. Claim Flow (User)

1. User clicks **“Claim Item”**
2. Answers verification question set by item owner
3. Claim is submitted with status **pending**
4. Item owner:
   - Reviews claim
   - Accepts or rejects
5. If approved:
   - Chat is enabled between both users
   - Claim status updated
6. Owner marks item as **returned**
7. System updates item state and sends notifications

---

### 💬 4. Messaging Flow (User)

1. User opens item and clicks **“Message”**
2. Chat interface loads previous messages
3. Messages sent via:
   - API + Socket.IO (real-time)
4. Message states:
   - Sent → Delivered → Read
5. Users receive:
   - Instant updates
   - Notifications if offline

---

### 🔧 5. Admin Flow

1. Admin logs in using **JWT authentication**
2. Accesses admin dashboard
3. Can view:
   - All users
   - All items
   - Reports/complaints
   - Platform analytics
4. Admin actions:
   - Block/unblock users
   - Delete inappropriate items
   - Update report status
5. Blocked users are automatically restricted from system access

---

## 🧰 Tech Stack

### Frontend
- React (Vite)
- TailwindCSS + Shadcn UI
- React Router
- Context API

### Backend
- Node.js + Express
- MongoDB (Mongoose)

### Authentication
- Clerk (User Auth)
- JWT (Admin Auth)

### Real-Time & Services
- Socket.IO  
- Web Push API  
- ImageKit  
- node-cron  

### JavaScript Architecture
- ES Modules (`import/export`)
- React JSX
- Service Worker (`sw.js`)

---

## 🗄️ Database Design

### 🔹 MongoDB Collections

#### 1. `users`

```js
{
  _id,
  clerkId,
  email,
  role: "user" | "admin",
  profileCompleted: Boolean,
  blocked: Boolean,
  savedItems: [ObjectId],
  createdAt
}
```

#### 2. `items`

```js
{
  _id,
  title,
  description,
  category,
  location,
  date,
  imageUrl,
  status: "Lost" | "Found",
  state: "active" | "claimed" | "returned",
  reportedBy, // reference to users
  claimQuestion,
  tags: [String],
  createdAt
}
```

#### 3. `claims`

```js
{
  itemId,
  claimantId,
  message,
  status: "pending" | "approved" | "rejected",
  createdAt
}
```

#### 4. `messages`

```js
{
  conversation,
  sender,
  receiver,
  message,
  status: "sent" | "delivered" | "read",
  createdAt
}
```
#### 5. `notifications`

```js
{
  recipient,
  sender,
  type,
  message,
  isRead: Boolean,
  createdAt
}
```
---

## 🧑‍💻 React Pages

* `/` → Landing Page
* `/dashboard` → Main feed (lost & found items)
* `/report` → Report item (lost/found)
* `/item/:id` → Item details + claim
* `/messages` → Chat system
* `/profile` → User profile
* `/saved-items` → Saved items
* `/admin/login` → Admin login
* `/admin/dashboard` → Admin panel

---

## 🔐 Backend (Node.js + Express)

* **Authentication:**
  - Clerk (User Authentication)
  - JWT (Admin Authentication)

* **Image Uploads:**
  - ImageKit (for storing and serving images)

* **Real-Time & Notifications:**
  - Socket.IO (real-time messaging)
  - Web Push API (notifications)

* **REST APIs (Core):**

  - Auth → `/api/v1/auth/*`
  - Items → `/api/v1/items/*`
  - Claims → `/api/v1/claims/*`
  - Messages → `/api/v1/messages/*`

  (Detailed endpoints listed below)  

---

## 🌐 API Endpoints

Base URL: `/api/v1`

---

### 🔐 Auth

| Method | Endpoint | Description |
|-------|----------|------------|
| POST | `/auth/sync` | Sync Clerk user with database |
| POST | `/auth/complete-profile` | Complete user profile |
| GET | `/auth/imagekit-auth` | Get ImageKit auth params |

---

### 👤 Users

| Method | Endpoint | Description |
|-------|----------|------------|
| GET | `/users/me` | Get current user |
| PATCH | `/users/me/update` | Update profile |
| GET | `/users/:id` | Get user profile |
| POST | `/users/toggle-block-chat/:itemId` | Block/unblock chat |
| POST | `/users/report/:userId` | Report a user |
| POST | `/users/subscribe` | Subscribe to push notifications |

---

### 📦 Items

| Method | Endpoint | Description |
|-------|----------|------------|
| POST | `/items` | Create item |
| GET | `/items` | Get all items (search/filter) |
| GET | `/items/:id` | Get single item |
| PATCH | `/items/:id` | Update item |
| DELETE | `/items/:id` | Delete item |
| PATCH | `/items/:id/returned` | Mark item as returned |
| POST | `/items/:id/save` | Save/unsave item |
| GET | `/items/saved` | Get saved items |
| GET | `/items/stats` | Get platform stats |

---

### 🧾 Claims

| Method | Endpoint | Description |
|-------|----------|------------|
| POST | `/claims/:itemId` | Create claim |
| GET | `/claims/my` | Get user claims |
| GET | `/claims/my-claim/:itemId` | Get claim for specific item |
| GET | `/claims/item/:itemId` | Get all claims for item |
| PATCH | `/claims/:claimId/verify` | Approve/reject claim |

---

### 💬 Messages

| Method | Endpoint | Description |
|-------|----------|------------|
| GET | `/messages` | Get conversations |
| GET | `/messages/unread/count` | Get unread message count |
| GET | `/messages/blocked` | Get blocked chats |
| POST | `/messages/:itemId` | Send message |
| GET | `/messages/:itemId` | Get messages |
| PATCH | `/messages/:itemId/read` | Mark messages as read |

---

### 🔔 Notifications

| Method | Endpoint | Description |
|-------|----------|------------|
| GET | `/notifications` | Get all notifications |
| PATCH | `/notifications/read-all` | Mark all as read |
| PATCH | `/notifications/:id/read` | Mark one as read |
| DELETE | `/notifications/:id` | Delete notification |
| DELETE | `/notifications` | Delete all notifications |
| GET | `/notifications/push/vapid-key` | Get VAPID key |
| POST | `/notifications/push/subscribe` | Subscribe push |
| POST | `/notifications/push/unsubscribe` | Unsubscribe push |

---

### 🛠 Admin

| Method | Endpoint | Description |
|-------|----------|------------|
| POST | `/admin/login` | Admin login |
| POST | `/admin/logout` | Admin logout |
| POST | `/admin/change-password` | Change password |
| GET | `/admin/analytics` | Dashboard analytics |
| GET | `/admin/items` | Get all items |
| DELETE | `/admin/items/:id` | Delete item |
| GET | `/admin/users` | Get all users |
| POST | `/admin/users/:userId/block` | Block/unblock user |
| GET | `/admin/reports` | Get reports |
| PATCH | `/admin/reports/:reportId/status` | Update report status |

---

## 🌐 Live Demo

🔗 https://campuscrate.vercel.app/

---

## ⚙️ Setup Instructions

### 1. Clone Repository
```bash
git clone https://github.com/ianshul1025/CampusCrate.git
cd CampusCrate
```

### 2. Install Dependencies
```bash
cd frontend
npm install

cd ../backend
npm install
```

### 3. Run Project
```bash
# start backend
cd backend
npm run dev

# start frontend (new terminal)
cd frontend
npm run dev
```

### 3. Environment Variables (.env)

PORT=5000  
MONGODB_URI=your_mongo_uri  
JWT_SECRET=your_secret  

CLERK_SECRET_KEY=your_key  
CLERK_PUBLISHABLE_KEY=your_key  

IMAGEKIT_PUBLIC_KEY=your_key  
IMAGEKIT_PRIVATE_KEY=your_key  

VAPID_PUBLIC_KEY=your_key  
VAPID_PRIVATE_KEY=your_key  

### 4. Run Project
npm run dev

---

## 📊 Summary

CampusCrate is a real-time MERN-based platform that enables structured lost & found management with authentication, claim verification, and messaging.
