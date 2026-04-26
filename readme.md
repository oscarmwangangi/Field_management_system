#  Field Monitoring System (CropProgress)

A modern web application for tracking crop progress across multiple fields, designed for coordinators (admins) and field agents.

---

##  Overview

The **Field Monitoring System** enables real-time tracking of agricultural activities, helping teams monitor crop stages, detect risks early, and manage field operations efficiently.

It supports:

* Role-based access (Admin & Agent)
* Field assignment and tracking
* Crop stage updates
* Risk detection for inactive fields
* Dashboard analytics

---

## Tech Stack

### Frontend

* React (TypeScript)
* Axios
* Tailwind CSS / Custom UI

### Backend

* Django
* Django REST Framework (DRF)
* JWT Authentication (SimpleJWT)

### Database

* SQLite (development)
* PostgreSQL (production-ready)

---

##  Authentication

* JWT-based authentication
* Login returns:

  * `access` token
  * `refresh` token
* All protected routes require:

```js
Authorization: Bearer <access_token>
```

---

## 👥 User Roles

### 1. Admin (Coordinator)

* View all agents
* Assign fields to agents
* View analytics (stats dashboard)
* Create agents

### 2. Field Agent

* View assigned fields
* Log crop updates
* Monitor field status
* Detect risks

---

##  Core Features

###  Dashboard

* Total fields
* Active fields
* At-risk fields
* Completed fields

### 🧑‍🌾 Field Management

* Create fields
* Assign agents
* Track crop type, location, planting date

###  Field Updates

Agents can log:

* Crop stage (`planted`, `growing`, `ready`, `harvested`)
* Notes/observations

---

## ⚠️ At-Risk Detection (Key Design Feature)

A field is automatically considered **"at risk"** if:

>  No update has been logged for more than **7 days**

### Implementation Logic

Backend calculates:

```python
days_since_update = (current_time - latest_update_time).days
```

If:

```python
days_since_update > 7
```

Then:

```python
status = "at_risk"
```

### Why this matters

* Encourages regular monitoring
* Helps detect neglected fields early
* Improves agricultural decision-making

---

## 🔄 Data Relationships

* One **Agent** → Many **Fields**
* One **Field** → Many **Updates**

```
User (Agent)
   ↓
Field
   ↓
FieldUpdate
```

---

##  API Endpoints

### Auth

* `POST /api/auth/login/`
* `POST /api/auth/register/`
* `POST /api/auth/send-otp/`

### Agents

* `GET /api/agents/`
* `GET /api/agents/stats/`
* `POST /api/agents/create/`
* `GET /api/agents/<id>/`

### Fields

* `GET /api/fields/`
* `POST /api/fields/`
* `GET /api/fields/<id>/`
* `POST /api/fields/<id>/assign/`

### Field Updates

* `GET /api/fields/<id>/updates/`
* `POST /api/fields/<id>/updates/`

---

##  Key Design Decisions

### 1. Backend-driven calculations

* Risk detection handled in backend
* Ensures consistency across frontend

### 2. JWT Authentication

* Stateless and scalable
* Works well with React frontend

### 3. Serializer-based aggregation

* `latest_update`
* `days_since_update`

Reduces frontend complexity.

---

### 4. Optimized Queries

Used:

```python
prefetch_related('fields', 'fields__field_updates')
```

✔ Reduces database hits
✔ Improves performance

---

### 5. Clean Separation of Roles

* Admin endpoints protected with `IsAdminUser`
* Agent endpoints require authentication only

---

## 🧪 Running the Project

### Backend

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔮 Future Improvements

* 🔔 Real-time notifications (WebSockets)
* 📊 Chart analytics (crop trends, risk patterns)
* 📍 Map-based field tracking
* 📱 Mobile app version
* 🤖 AI-based crop health prediction

---

## 👨‍💻 Author

Built as a full-stack project demonstrating:

* System design
* API development
* Frontend UX
* Real-world problem solving

---

## 📌 Summary

This system provides a scalable and efficient way to:

✔ Monitor crop progress
✔ Detect risks early
✔ Improve field management
✔ Support data-driven agriculture

---

🌱 *Helping teams grow smarter, not harder.*
