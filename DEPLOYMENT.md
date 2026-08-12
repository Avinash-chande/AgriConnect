# AgriConnect Complete Production Deployment Guide

This document provides step-by-step instructions for deploying AgriConnect to production across **Vercel** (Frontend), **Render** (Backend), and **MongoDB Atlas** (Database).

---

## 1. MongoDB Atlas Database Setup

### Step 1.1: Create Cluster & Database User
1. Log into [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new Dedicated/Serverless M10+ Cluster in your target region (e.g. AWS `ap-south-1` Mumbai).
3. Under **Database Access**, create a database user:
   - User Name: `agriconnect_prod_user`
   - Authentication: Password (use 32+ char strong random password)
   - Role: `readWrite` on `agriconnect` database.

### Step 1.2: Network Access & IP Whitelisting
1. Under **Network Access**, click **Add IP Address**.
2. Add your Render backend outbound IP addresses (or `0.0.0.0/0` with strong password authentication).

### Step 1.3: Connection String & Pooling Configuration
Construct your production connection string:
```env
MONGODB_URI=mongodb+srv://agriconnect_prod_user:<PASSWORD>@agriconnect-prod.mongodb.net/agriconnect?retryWrites=true&w=majority&appName=AgriConnectProd
```
*Mongoose is configured with connection pooling (`maxPoolSize: 50`, `minPoolSize: 10`, `serverSelectionTimeoutMS: 5000`) in `backend/config/db.js`.*

---

## 2. Backend Deployment on Render

### Step 2.1: Create Render Web Service
1. Log into [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository (`AgriConnect`).
4. Configure Service Settings:
   - **Name**: `agriconnect-backend`
   - **Region**: Singapore (or closest to users)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Health Check Path**: `/health`

### Step 2.2: Environment Variables Setup (Render Dashboard)
Add the following secrets under **Environment**:

| Environment Variable | Description |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `5000` (or leave default for Render) |
| `MONGODB_URI` | `mongodb+srv://...` (Atlas connection string) |
| `JWT_ACCESS_SECRET` | 64+ char random secret key |
| `JWT_REFRESH_SECRET` | 64+ char random secret key |
| `COOKIE_SECRET` | 32+ char random secret key |
| `CORS_ORIGIN` | `https://your-app.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name |
| `CLOUDINARY_API_KEY` | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret |
| `RAZORPAY_KEY_ID` | Razorpay Live Key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay Live Key Secret |
| `GROQ_API_KEY` | Groq AI Cloud API Key |
| `REDIS_URL` | *(Optional)* `redis://default:password@redis-host:6379` |

---

## 3. Frontend Deployment on Vercel

### Step 3.1: Connect Repository to Vercel
1. Log into [Vercel Dashboard](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository (`AgriConnect`).

### Step 3.2: Build Settings & Environment Variables
1. Framework Preset: **Vite**
2. Root Directory: `./` (Root)
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Add Environment Variable:
   - `VITE_API_URL`: `https://agriconnect-backend.onrender.com/api/v1`

6. Click **Deploy**. Vercel will automatically generate HTTPS SSL certificates and deploy SPA routing powered by [vercel.json](file:///e:/Agriconnect/AgriConnect/vercel.json).

---

## 4. Production Health & Readiness Verification

Once deployed, verify operational status:
- **Aggregated Health Check**: `https://agriconnect-backend.onrender.com/health` (Returns 200 OK with uptime, DB status, and Redis status)
- **Liveness Check**: `https://agriconnect-backend.onrender.com/liveness` (Returns 200 OK process status)
- **Readiness Check**: `https://agriconnect-backend.onrender.com/readiness` (Verifies MongoDB connection)
