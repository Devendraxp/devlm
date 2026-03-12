import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";

export const extractWebPageTool = tool({
  description: "Extract structured content from a specific webpage URL",

  inputSchema: z.object({
    url: z.string().describe("The URL of the webpage to extract content from"),
  }),

  async execute({ url }: { url: string }) {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      throw new Error("TAVILY_API_KEY is not set");
    }

    const tvly = tavily({ apiKey });
    const response = await tvly.extract([url]);
    return response.results;
  },
});
