# AlignME

A full-stack interview preparation app with a React/Vite frontend and an Express/MongoDB backend. The app uses Google Gemini AI to generate custom interview strategies, technical and behavioral questions, skill gaps, and a preparation roadmap based on user-provided resume, self-description, and job description.

## Project Structure

- `backend/`
  - Express server
  - MongoDB models and controllers
  - Google GenAI integration for interview report generation
  - Resume parsing and PDF generation
- `frontend/`
  - React app with Vite
  - Interview generation UI and report display
  - Authentication and protected route support

## Prerequisites

- Node.js 20+ installed
- MongoDB connection string
- Google Gemini API key

## Setup

### Backend

1. Navigate to the backend folder:
   ```bash
   cd "d:\GenAi Project\backend"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with:
   ```env
   MONGO_URI=your-mongodb-connection-string
   JWT_SECRET=your-jwt-secret
   GOOGLE_GENAI_API_KEY=your-google-genai-api-key
   ```
4. Start the backend:
   ```bash
   npm run dev
   ```

### Frontend

1. Navigate to the frontend folder:
   ```bash
   cd "d:\GenAi Project\frontend"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend:
   ```bash
   npm run dev
   ```

## Usage

- Open the frontend URL shown by Vite (usually `http://localhost:5173`)
- Register or log in if authentication is enabled
- Upload a PDF resume or self descriptions and enter job descriptions for the targeted role
- Generate an interview strategy and view the report

## Environment Variables

Required for the backend:

- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret used to sign JWT tokens
- `GOOGLE_GENAI_API_KEY` - Google Gemini API key
