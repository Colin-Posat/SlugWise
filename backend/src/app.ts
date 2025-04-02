import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import setsRoutes from "./routes/setRoutes";
import distractorRoutes from "./routes/distractorRoutes"; // Import the new distractor routes

import { signupInit, completeSignup } from "./controllers/authController";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"], // Allow both frontend environments
    credentials: true,
  })
);

app.use(express.json());

// Route registrations
app.use("/api/auth", authRoutes);
app.use("/api/sets", setsRoutes);
app.use("/api/quiz", distractorRoutes); // Add the distractor routes

// Direct route definitions for auth
app.post("/api/auth/signup-init", signupInit);
app.post("/api/auth/complete-signup", completeSignup);

export default app;