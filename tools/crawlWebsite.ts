import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";

export const crawlWebsiteTool = tool({
  description: "Crawl a website and retrieve content from multiple pages",

  inputSchema: z.object({
    url: z.string().describe("The root URL to start crawling from"),
    instruction: z
      .string()
      .optional()
      .describe("Optional instruction to focus the crawl (e.g. 'only API docs')"),
  }),

  async execute({ url, instruction }: { url: string; instruction?: string }) {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      throw new Error("TAVILY_API_KEY is not set");
    }

    const tvly = tavily({ apiKey });
    const response = await tvly.crawl(url, instruction ? { instruction } : {});
    return response.results;
  },
});
