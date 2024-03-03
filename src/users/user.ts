import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT } from "../config";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
  
};

export async function user(userId: number) {
  const _user = express();
  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;
  
  _user.use(express.json());
  _user.use(bodyParser.json());

  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });
  
  _user.post("/message", (req, res) => {
    const { message } = req.body;
    lastReceivedMessage = message;
    res.send("success");
  });
  
  _user.get("/status", (req, res) => {
    res.send("live"); 
  })
  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
