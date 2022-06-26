import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi";
import cors from "cors";
import dotenv from "dotenv";
import dayjs from "dayjs";

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);

let now = dayjs();

now.locale("pt-br");

const loginSchema = joi.object({
  name: joi.string().required(),
});

let db;
mongoClient.connect(() => {
  db = mongoClient.db("bate_papo_uol");
});
const app = express();
app.use([express.json(), cors()]);

app.post("/participants", async (req, res) => {
  const validation = loginSchema.validate(req.body);

  if (validation.error) {
    res.sendStatus(422);
    return;
  }

  try {
    const { name } = req.body;
    const participant = await db
      .collection("participants")
      .findOne({ name: name });
    if (participant) {
      res.sendStatus(409);
      return;
    }
    await db.collection("participants").insertOne({
      name,
      lastStatus: Date.now(),
    });
    await db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: now.format("HH:mm:ss"),
    });
    res.sendStatus(201);
  } catch (error) {
    res.status(500).send("Ops, ocorreu algum problema!");
  }
});

app.listen(5000, () => {
  console.log("servidor rodando na porta 5000");
  console.log(now.format("HH:mm:ss"));
});
