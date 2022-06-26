import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect(() => {
  db = mongoClient.db("bate_papo_uol");
});
const app = express();
app.use([express.json(), cors()]);

app.listen(5000, () => {
  console.log("servidor rodando na porta 5000");
});
