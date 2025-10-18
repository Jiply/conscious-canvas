"use node";
import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";
import { action } from "./_generated/server";

/**
 * Generate a profile picture using Gemini 2.5 Flash Image (nano banana)
 */
export const generateProfilePicture = action({
  args: {
    name: v.string(),
    role: v.string(),
    personality: v.string(),
  },
  returns: v.string(), // Returns base64 encoded image
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment variables");
    }

    const ai = new GoogleGenAI({ apiKey });

    // Create a detailed prompt for the profile picture
    const prompt = `Create a professional profile picture for a person with the following characteristics:
Name: ${args.name}
Role: ${args.role}
Personality: ${args.personality}

Style: Modern, friendly, cartoon/illustrated style with soft colors and rounded features. The person should be looking at the camera with a warm expression. Square format, centered composition, suitable for a profile picture. Background should be a subtle gradient or solid color that complements the character.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      });

      // Extract the image data from the response
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error("No candidates in Gemini response");
      }

      const candidate = response.candidates[0];
      if (!candidate || !candidate.content || !candidate.content.parts) {
        throw new Error("Invalid candidate in Gemini response");
      }

      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          // Return base64 encoded image data with data URI prefix
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }

      throw new Error("No image data found in Gemini response");
    } catch (error) {
      throw error;
    }
  },
});
