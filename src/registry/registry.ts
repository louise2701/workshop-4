// registry.ts
import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";
import { randomBytes } from "crypto";
import { generateRsaKeyPair, exportPubKey } from "../crypto";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

const nodes: Node[] = [];

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  _registry.get("/status", (req, res) => {
    res.send("live");
  });

  _registry.post("/registerNode", async (req: Request<any, any, RegisterNodeBody>, res: Response<GetNodeRegistryBody | { error: string }>) => {
    const { nodeId } = req.body;
    const existingNode = nodes.find((node) => node.nodeId === nodeId);

    if (!existingNode) {
      // Generate RSA key pair for the new node
      const { publicKey, privateKey } = await generateRsaKeyPair();

      // Export the public key to base64 format
      const pubKey = await exportPubKey(publicKey);

      const newNode: Node = {
        nodeId,
        pubKey,
      };

      nodes.push(newNode);
      res.json({ nodes });
    } else {
      res.status(400).json({ error: "Node already registered with the given ID." });
    }
  });

  _registry.get("/getNodeRegistry", (req, res) => {
    res.json({ nodes });
  });

  _registry.get("/getPrivateKey", (req, res) => {
    const privateKey = generatePrivateKey();
    res.json({ result: privateKey });
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`Registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}

function generatePrivateKey(): string {
  const privateKeyBytes = randomBytes(32);
  const privateKeyBase64 = privateKeyBytes.toString("base64");
  return privateKeyBase64;
}
