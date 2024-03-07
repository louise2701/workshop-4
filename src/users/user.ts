import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT, BASE_ONION_ROUTER_PORT } from "../config";
import {Node, GetNodeRegistryBody} from "../registry/registry";
import {createRandomSymmetricKey, exportSymKey, importSymKey, rsaEncrypt, symEncrypt} from "../crypto";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

let lastReceivedMessage: string | null = null;
let lastSentMessage: string | null = null;

let lastCircuit: Node[] = [];

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  _user.get("/status", (req, res) => {
    res.send("live");
  });

  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });
  //4
  _user.post("/message", (req, res) => {
    const { message } = req.body;
    lastReceivedMessage = message;
    res.send("success");
  });
  
 //6.1
  
 
  _user.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId } = req.body;
    const nodes = await fetch(`http://localhost:8080/getNodeRegistry`)
        .then((res) => res.json() as Promise<GetNodeRegistryBody>)
        .then((body) => body.nodes);


    //create a random circuit of 3 distinct nodes with the help of the node registry
    let circuit: Node[] = [];
    while (circuit.length < 3) {
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
      if (!circuit.includes(randomNode)) {
        circuit.push(randomNode);
      }
    }

    let destination = `${BASE_USER_PORT + destinationUserId}`.padStart(10, "0");
    let finalSend = message;

    for (const currentNode of circuit) {
      const randomSymmetricKey = await createRandomSymmetricKey();
      const symmetricKeyBase64 = await exportSymKey(randomSymmetricKey);
    
      const messageConcatenation = `${destination}${finalSend}`;
      const encryptedMessage = await symEncrypt(randomSymmetricKey, messageConcatenation);
    
      destination = `${String(BASE_ONION_ROUTER_PORT + currentNode.nodeId).padStart(10, '0')}`;
    
      const encryptedSymmetricKey = await rsaEncrypt(symmetricKeyBase64, currentNode.pubKey);
      finalSend = encryptedSymmetricKey.concat(encryptedMessage);
    }
    

// Reverse the circuit for decryption
circuit.reverse();
lastCircuit = circuit;
lastSentMessage = message;

    //send the result to the entry node
    await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + circuit[0].nodeId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: finalSend }),
    });
    res.send("sucess");
  });

  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });
  _user.get("/getLastCircuit", (req, res) => {
    res.json({result: lastCircuit.map((node) => node.nodeId)});
  });
  return server;
}