import bodyParser from "body-parser";
import express from "express";
import axios from "axios";
import { BASE_ONION_ROUTER_PORT } from "../config";
import { REGISTRY_PORT } from "../config";
import { generateRsaKeyPair, exportPubKey, exportPrvKey, importPrvKey, rsaDecrypt, symDecrypt } from "../crypto";
import { Node } from "../registry/registry";

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());
  let lastReceivedDecryptedMessage: string | null = null;
  let lastReceivedEncryptedMessage: string | null = null;
  let lastMessageSource: number | null = null;
  let lastMessageDestination: number | null = null;

  let rsa = await generateRsaKeyPair();
  let pubKey = await exportPubKey(rsa.publicKey);
  let privKey = rsa.privateKey;
  let node: Node = { nodeId: nodeId, pubKey: pubKey };


  
  onionRouter.get("/status", (req, res) => {
    res.send("live");
  });

  
  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });

  
  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });


  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination });
  });
 
  const res = await fetch(`http://localhost:${REGISTRY_PORT}/registerNode`, {
    method: "POST",
    body: JSON.stringify({
      nodeId,
      pubKey: pubKey,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  console.log(await res.json());
  onionRouter.post("/message", async (req, res) => {
    const {message} = req.body;
    const decryp = await rsaDecrypt(message.slice(0, 344), privKey);
    const decryptedMess = await symDecrypt(decryp, message.slice(344));
    const Destinationnex = parseInt(decryptedMess.slice(0, 10), 10);
    const remainMessage = decryptedMess.slice(10);

    lastReceivedEncryptedMessage = message;
    lastReceivedDecryptedMessage = remainMessage;
    lastMessageDestination = Destinationnex;

    await fetch(`http://localhost:${Destinationnex}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: remainMessage }),
    });
    res.send("sucess");
  });
  

  onionRouter.get("/getPrivateKey", async (req, res) => {
    res.json({result: await exportPrvKey(privKey)});
  });
  
  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(`Onion router ${nodeId} is listening on port ${BASE_ONION_ROUTER_PORT + nodeId}`);
  });
 

  return server;
}