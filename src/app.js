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
  name: joi.string().required().min(1),
});

const messageBodySchema = joi.object({
  to: joi.string().required().min(1),
  text: joi.string().required().min(1),
  type: joi.string().valid("message", "private_message"),
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
  } catch (err) {
    res.status(500).send("Ops, ocorreu algum problema!");
  }
});

app.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find().toArray();
    res.status(200).send(participants.map((participant) => participant.name));
  } catch (err) {
    res.status(500).send("Ops, ocorreu algum problema!");
  }
});

app.post("/messages", async (req, res) => {
  const bodyValidation = messageBodySchema.validate(req.body);
  const participantName = req.headers.from;
  const isParticipant = await db
    .collection("participants")
    .findOne({ name: `${participantName}` });
  if (!isParticipant) {
    res.sendStatus(422);
    return;
  }

  if (bodyValidation.error) {
    res.sendStatus(422);
    return;
  }

  try {
    const message = {
      ...req.body,
      from: req.headers.from,
      time: now.format("HH:mm:ss"),
    };
    await db.collection("messages").insertOne(message);
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send("Ops, ocorreu algum problema!");
  }
});

app.listen(5000, () => {
  console.log("servidor rodando na porta 5000");
  console.log(now.format("HH:mm:ss"));
});
