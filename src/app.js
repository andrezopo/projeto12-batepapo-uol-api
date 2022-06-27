import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import joi from "joi";
import cors from "cors";
import dotenv from "dotenv";
import dayjs from "dayjs";

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);

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
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send("Ops, ocorreu algum problema!");
  }
});

app.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find().toArray();
    res.status(200).send(
      participants.map((participant) => {
        return { name: participant.name };
      })
    );
  } catch (err) {
    res.status(500).send("Ops, ocorreu algum problema!");
  }
});

app.post("/messages", async (req, res) => {
  const bodyValidation = messageBodySchema.validate(req.body);
  const participantName = req.headers.user;
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
      from: req.headers.user,
      time: dayjs().format("HH:mm:ss"),
    };
    await db.collection("messages").insertOne(message);
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send("Ops, ocorreu algum problema!");
  }
});

app.get("/messages", async (req, res) => {
  try {
    const limit = req.query.limit;
    const { user } = req.headers;
    const allMessages = await db.collection("messages").find().toArray();
    const userMessages = allMessages.filter((message) => {
      if (
        message.type === "private_message" &&
        message.from !== user &&
        message.to !== user
      ) {
        return false;
      }
      return true;
    });

    if (!limit) {
      res.send(userMessages);
      return;
    } else {
      const lastMessages = [...userMessages].slice(-limit);
      res.send(lastMessages);
    }
  } catch (err) {
    res.status(500).send("Ops, ocorreu algum problema!");
  }
});

app.post("/status", async (req, res) => {
  try {
    const { user } = req.headers;
    const participant = await db
      .collection("participants")
      .findOne({ name: user });
    if (!participant) {
      res.sendStatus(404);
      return;
    }
    await db.collection("participants").updateOne(
      { name: user },
      {
        $set: {
          name: user,
          lastStatus: Date.now(),
        },
      }
    );
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send("Ops, ocorreu algum problema!");
  }
});

app.delete("/messages/:messageId", async (req, res) => {
  try {
    const { user } = req.headers;
    const { messageId } = req.params;
    const messageToDelete = await db
      .collection("messages")
      .findOne({ _id: ObjectId(messageId) });
    if (!messageToDelete) {
      res.sendStatus(404);
      return;
    }
    if (messageToDelete.from !== user) {
      res.sendStatus(401);
      return;
    }
    await db.collection("messages").deleteOne({ _id: ObjectId(messageId) });
    res.status(200).send();
  } catch (err) {
    res.status(500).send("Ops, ocorreu algum problema!");
  }
});

async function removeInactiveParticipants() {
  const time = Date.now();
  const participants = await db.collection("participants").find().toArray();
  const participantsToRemove = participants.filter((participant) => {
    if (time - participant.lastStatus > 10000) {
      return true;
    } else {
      return false;
    }
  });
  participantsToRemove.forEach((participant) => {
    db.collection("participants").deleteOne({ name: participant.name });
    db.collection("messages").insertOne({
      from: participant.name,
      to: "Todos",
      text: "sai da sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    });
  });
}

setInterval(removeInactiveParticipants, 15000);

app.listen(5000, () => {
  console.log("servidor rodando na porta 5000");
  console.log(dayjs().format("HH:mm:ss"));
});
