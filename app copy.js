import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import DBConnection from "./db/mongodb.js";

dotenv.config();
const port = process.env.PORT || 3000;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

await DBConnection();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});
