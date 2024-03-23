import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT, REGISTRY_PORT, BASE_ONION_ROUTER_PORT } from "../config";
import {rsaEncrypt, symEncrypt, createRandomSymmetricKey, exportSymKey, importPubKey} from "../crypto";
import {Node} from "../registry/registry";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;
  let lastCircuit : Node[] = [];

  // TODO implement the status route
  _user.get("/status", (req, res) => {
    res.send("live");
  });

  _user.get("/getLastReceivedMessage", async (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });
  
  

  _user.post("/message", (req, res) => {
    const { message } = req.body as { message: string };
    lastReceivedMessage = message;
    res.send("success"); 
  });

  _user.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId } = req.body;
    const nodes = await fetch(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`)
      .then((res) => res.json())
      .then((body: any) => body.nodes);
    let circuit: Node[] = [];
    for (let i = nodes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
    }
    circuit = nodes.slice(0, 3);

    lastSentMessage = message;
    let messageToSend = lastSentMessage;
    for (let i = circuit.length - 1; i >= 0; i--) {
      const node = circuit[i];
      const symKey = await createRandomSymmetricKey();
      const destination = i == circuit.length - 1 ?
      `${BASE_USER_PORT + destinationUserId}`.padStart(10, '0') : 
      `${BASE_ONION_ROUTER_PORT + circuit[i + 1].nodeId}`.padStart(10, '0');
      console.log(destination)
      const messageToEncrypt = `${destination + messageToSend}`;
      const encryptedMessage = await symEncrypt(symKey, messageToEncrypt);
      const encryptedSymKey = await rsaEncrypt(await exportSymKey(symKey), node.pubKey);
      messageToSend = encryptedSymKey + encryptedMessage;
    }
    console.log(circuit)

    const entryNode = circuit[0];
    lastCircuit = circuit
    await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + entryNode.nodeId}/message`, {
      method: "POST",
      body: JSON.stringify({ message: messageToSend }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    lastSentMessage = message; 
    res.send("success");
  });
  
  _user.get("/getLastCircuit", (req, res) => {
    res.json({ result: lastCircuit.map((node) => node.nodeId) });
  });

    const server = _user.listen(BASE_USER_PORT + userId, () => {
      console.log(
        `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
      );
    });

  return server;
}