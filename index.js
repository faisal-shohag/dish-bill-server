import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import bodyParser from "body-parser";

// 
import get from "./API/get.js"
import post from "./API/post.js"
import put from "./API/put.js"
import Delete from "./API/delete.js"

const app = express();
const PORT = process.env.PORT || 5000;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "https://dish-bill.netlify.app"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("🚀 Working fine!");
});

app.use(get)
app.use(post)
app.use(put)
app.use(Delete)

app.listen(PORT, () => {
  console.log(`🚀 App is Running on ${PORT}`);
});