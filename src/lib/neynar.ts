import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

const apiKey = process.env.NEYNAR_API_KEY || "";

export function getNeynarClient(): NeynarAPIClient {
  if (!apiKey) {
    throw new Error("NEYNAR_API_KEY is not set");
  }
  const config = new Configuration({ apiKey });
  return new NeynarAPIClient(config);
}


