import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";
import {exportPrvKey, generateRsaKeyPair} from "../crypto";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};
//3
type Payload = {
  result: string | null; 
};
let nodeRegistry: Node[] = [];

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  _registry.get("/status", (req, res) => {
    res.send("live");
  });
  let getNodeRegistryBody: GetNodeRegistryBody = { nodes: [] };

//3.1
  _registry.post("/registerNode", (req, res) => {
    const { nodeId, pubKey } = req.body as RegisterNodeBody;
    const existingNode = nodeRegistry.find((node) => node.nodeId === nodeId);
    if (existingNode) {
      return res.status(400).json({ error: "Node already registered" });
    }
    const newNode: Node = { nodeId, pubKey };
    nodeRegistry.push(newNode);
    return res.status(200).json({ message: "Node registered successfully", node: newNode });
  });
  //3.2
  _registry.get("/getPrivateKey/:nodeId", async (req: Request, res: Response<Payload>) => {
    const nodeId = parseInt(req.params.nodeId);

    //So we have to generate RSA key pair foreach of ournode
    const { publicKey, privateKey } = await generateRsaKeyPair();

    //After that we have to have our private key in base64 string
    const privateKeyBase64 = privateKey ? await exportPrvKey(privateKey) : '';

    res.json({ result: privateKeyBase64 });
  });
//3.4
  _registry.get("/getNodeRegistry", (req: Request, res: Response<GetNodeRegistryBody>) => {
    const response: GetNodeRegistryBody = {
      nodes: nodeRegistry
    };
    res.json(response);
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log('registry is listening on port ${REGISTRY_PORT}');
  });

  return server;
}