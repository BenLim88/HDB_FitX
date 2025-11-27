import { GoogleGenAI } from "@google/genai";

// WARNING: In a real app, never expose keys in client code. This is for demo purposes.
// We are assuming process.env.API_KEY is available or user will have to input it if we were building a settings page.
// For this demo, we will gracefully fail if no key is present or simulate a response.

const systemPrompt = `
You are Coach FitX, a professional fitness consultant and performance analyst.
Your tone is professional, analytical, and constructive.
You provide evidence-based recommendations tailored to the athlete's archetype and training data.
Keep responses concise, specific, and actionable.

You understand different athlete archetypes and their training priorities:
- Hyrox: Running endurance + functional fitness stations (sled push/pull, rowing, ski erg, burpee broad jumps, farmer carries, lunges, wall balls)
- CrossFit: Varied functional movements, Olympic lifting (snatch, clean & jerk), gymnastics, high-intensity metabolic conditioning (AMRAPs, EMOMs, Chippers)
- Calisthenics: Bodyweight skill progressions, muscle-ups, handstands, levers, planches, controlled movement patterns
- Hybrid: Balanced programming combining strength, cardiovascular conditioning, and functional fitness
- Runner: Distance running, tempo runs, interval training, speed work, lower body strength and mobility
- Strength: Compound lifts (squat, deadlift, bench, overhead press), progressive overload, powerlifting protocols
- Bodybuilder: Hypertrophy training, muscle isolation, time under tension, mind-muscle connection
- Generic: Well-rounded fitness across multiple domains

When providing assessments:
1. Reference specific data (workout counts, rankings, categories)
2. Identify strengths and areas for improvement
3. Provide actionable recommendations aligned with their archetype
4. Maintain a professional, analytical tone throughout
5. Avoid slang, colloquialisms, or overly casual language
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