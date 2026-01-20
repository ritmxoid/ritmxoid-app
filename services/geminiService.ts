
import { GoogleGenAI, Type } from "@google/genai";
import { RhythmLevel, BeatNote, AIResponse } from "../types";

// Fix: Use direct process.env.API_KEY and named parameter for initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateLevelFromPrompt(prompt: string, difficulty: string): Promise<RhythmLevel> {
  const noteDensity = difficulty === 'HARD' ? 8 : difficulty === 'MEDIUM' ? 5 : 3;

  // Fix: Use gemini-3-pro-preview for advanced level reasoning/generation
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Generate a rhythm game level based on the following prompt: "${prompt}". 
               The difficulty is ${difficulty}. 
               Create a JSON structure containing a title, a bpm (between 80-180), a color hex, a vibe description, and an array of 'patterns'.
               Each pattern should have a 'lane' (0 for Left, 1 for Up, 2 for Down, 3 for Right) and a 'timestamp' in seconds. 
               The track should be 30 seconds long. 
               Aim for approximately ${30 * noteDensity} notes.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          bpm: { type: Type.NUMBER },
          vibe: { type: Type.STRING },
          color: { type: Type.STRING },
          patterns: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                lane: { type: Type.NUMBER },
                timestamp: { type: Type.NUMBER }
              },
              required: ["lane", "timestamp"]
            }
          }
        },
        required: ["title", "bpm", "patterns", "color"]
      }
    }
  });

  const data: AIResponse = JSON.parse(response.text.trim());

  const notes: BeatNote[] = data.patterns.map((p, idx) => ({
    id: `note-${idx}`,
    time: p.timestamp,
    lane: p.lane as any,
    hit: false,
    missed: false
  })).sort((a, b) => a.time - b.time);

  return {
    title: data.title,
    bpm: data.bpm,
    duration: 30,
    notes,
    vibe: data.vibe,
    color: data.color || "#22d3ee"
  };
}
