# CasVarDB Setup Guide

A live version of CasVarDB is available at: http://crisprxai.cs.ox.ac.uk:3000.

This document explains how to set up CasVarDB locally after downloading the repository, including database initialization, data import, and starting both backend and frontend services.

---

## Prerequisites

Please make sure the following tools are installed on your machine before starting:

- Python - https://www.python.org/downloads/
- Node.js - https://nodejs.org/en/download/current
- Docker - https://www.docker.com/

---

## Project Structure

This project is organized with separate backend and frontend directories.

- `backend/`: database setup, data import, and backend service
- `frontend/`: frontend web application

---

## Setup Database

Open a terminal and navigate to the `backend` directory:
```
cd backend
```

<br>

Start the local MySQL database with Docker Compose:

```
docker compose up -d
```
This will start an empty local database exposed on port `13306`.

<br>

Create a Python virtual environment called `myvenv`:
```
python -m venv .myvenv
```

<br>

Activate the virtual environment.

On Windows:
```
.myvenv\Scripts\activate
```

On macOS / Linux:
```
source .myvenv/bin/activate
```

<br>


Install the required Python packages:
```
pip install pandas pymysql gdown
```

<br>

Run the import script to download the source data from Google Drive and populate the database:
```
python import_data.py
```

This script will:

- download the required dataset files from Google Drive

- process the data

- insert the data into the local MySQL database

Once this step completes successfully, the local database setup is finished.

## Start the Backend
Still inside the `backend` directory, start the backend service:
```
npm start
```

## Start the Frontend
Open a second terminal window, navigate to the `frontend` directory, and start the frontend service:
```
cd frontend
npm start
```
The website should open automatically in your default browser.
