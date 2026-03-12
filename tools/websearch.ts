import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";

export const webSearchTool = tool({
  description: "Search the web for up-to-date information on a topic",

  inputSchema: z.object({
    query: z.string().describe("The search query to look up"),
  }),

  async execute({ query }: { query: string }) {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      throw new Error("TAVILY_API_KEY is not set");
    }

    const tvly = tavily({ apiKey });

    const response = await tvly.search(query, {
      search_depth: "advanced",
      max_results: 5,
    });

    return response.results;
  },
});


