import { GoogleGenAI } from "@google/genai";

// WARNING: In a real app, never expose keys in client code. This is for demo purposes.
// We are assuming process.env.API_KEY is available or user will have to input it if we were building a settings page.
// For this demo, we will gracefully fail if no key is present or simulate a response.

const systemPrompt = `
You are Coach FitX, an elite fitness coach for HDB residents in Singapore.
Your tone is encouraging, energetic, and slightly strict (like a sergeant major but nice).
You specialize in Hyrox, CrossFit, and Calisthenics.
Always suggest workouts that can be done in an HDB fitness corner (pullup bars, dip bars, floor) or void deck (running).
Keep responses concise and punchy.

You understand different athlete archetypes:
- Hyrox: Running + functional fitness stations (sled, rowing, burpees, farmer carries)
- CrossFit: Varied functional movements, Olympic lifts, metcons, AMRAPs, EMOMs
- Calisthenics: Bodyweight mastery, progressions, muscle-ups, handstands, levers
- Hybrid: Mix of strength, cardio, and functional training
- Runner: Distance running, tempo runs, intervals, leg strength
- Strength: Compound lifts, progressive overload, powerlifting movements
- Bodybuilder: Hypertrophy, muscle isolation, controlled reps, mind-muscle connection
- Generic: Well-rounded fitness approach

When giving personalized advice, consider their archetype and recent activity level.
Use Singapore-style tough love - like a strict but caring encik (sergeant).
`;

export const GeminiService = {
  generateAdvice: async (query: string): Promise<string> => {
    if (!process.env.API_KEY) {
      console.warn("No API Key found. Returning mock response.");
      return "⚠️ AI Coach Disabled: Configure API_KEY to receive elite coaching advice. For now: Do 50 burpees!";
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
          systemInstruction: systemPrompt,
          thinkingConfig: { thinkingBudget: 0 }, // Low latency
        },
      });
      return response.text || "Keep pushing! (AI returned empty)";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Coach is currently offline. Drink water and rest 2 mins.";
    }
  },

  generateWorkoutPlan: async (prompt: string): Promise<any[]> => {
      if (!process.env.API_KEY) {
          // Mock response if no key
          return [
              { name: 'Air Squats', target: '20 reps', weight: 'BW', sets: 3 },
              { name: 'Push-ups', target: '15 reps', weight: 'BW', sets: 3 },
              { name: 'Lunges', target: '20 reps', weight: 'BW', sets: 3 },
              { name: 'Plank', target: '60 secs', weight: 'BW', sets: 1 }
          ];
      }

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const jsonPrompt = `
            Create a workout based on this request: "${prompt}".
            Return ONLY a raw JSON array (no markdown formatting, no code blocks).
            The JSON should be a list of objects with these keys: 
            "name" (string), 
            "target" (string, e.g. '10 reps' or '30s'), 
            "weight" (optional string),
            "sets" (number, default to 1 if not specified).
            Use standard functional fitness exercises.
          `;
          
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: jsonPrompt,
              config: {
                   // Explicitly asking for JSON in prompt, but keeping config simple
              }
          });

          let text = response.text || "[]";
          // Clean up markdown if Gemini adds it
          text = text.replace(/```json/g, '').replace(/```/g, '').trim();
          
          return JSON.parse(text);
      } catch (e) {
          console.error("AI Generation Error", e);
          return [];
      }
  }
};