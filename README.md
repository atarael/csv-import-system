# CSV Import System

This project implements a CSV import system that allows uploading CSV files,
processing them asynchronously in the background, and tracking job progress.

Each uploaded file creates a job that is processed one at a time.
The system provides progress updates and a downloadable error report for failed rows.

## Setup Instructions

Backend
cd backend
npm i
npm run dev

The backend server runs on:
http://localhost:3000

Frontend
cd frontend
npm i
npm start

By default, the frontend connects to the backend on:
http://localhost:3000

---

## Bonuses Implemented

Bonus 1 – Live job progress updates using WebSocket  
Bonus 2 – Job queue with background processing (in-memory, one job at a time)  
Bonus 3 – Downloadable CSV error report  

---

## Assumptions

Jobs are processed sequentially (one job at a time), as parallel processing was not required.  
Job progress update frequency was not specified, so progress is updated in batches of 50 rows to improve performance.
