import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// Initialize GoogleGenAI server-side client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Server-side persistent storage backup (data/tasks.json)
const DATA_DIR = path.resolve(__dirname, 'data');
const TASKS_FILE = path.resolve(DATA_DIR, 'tasks.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadTasksFromFile(): any[] {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      const content = fs.readFileSync(TASKS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading tasks file:', err);
  }
  return [];
}

function saveTasksToFile(tasks: any[]) {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving tasks file:', err);
  }
}

// REST endpoints for Tasks
app.get('/api/tasks', (_req: Request, res: Response) => {
  const tasks = loadTasksFromFile();
  res.json({ tasks });
});

app.post('/api/tasks/sync', (req: Request, res: Response) => {
  const { tasks } = req.body;
  if (Array.isArray(tasks)) {
    saveTasksToFile(tasks);
    res.json({ success: true, count: tasks.length });
  } else {
    res.status(400).json({ error: 'tasks must be an array' });
  }
});

// AI Endpoint 1: Parse Natural Language into a structured Task
app.post('/api/agent/parse-task', async (req: Request, res: Response) => {
  try {
    const { input, currentTime } = req.body;
    if (!input || typeof input !== 'string') {
      res.status(400).json({ error: 'input string required' });
      return;
    }

    const nowIso = currentTime || new Date().toISOString();

    const prompt = `You are an AI task scheduler and reminder assistant.
The user wants to schedule a task to be persistently reminded of.
Current local time is: ${nowIso}.

Analyze the user's input: "${input}".

Extract:
1. title: Clean, action-oriented title of the task.
2. description: Any extra context or details mentioned.
3. category: Best category (one of: 'Work', 'Personal', 'Health', 'Errands', 'Finance', 'Urgent').
4. priority: One of 'urgent', 'high', 'medium', 'low'. Default to 'high' if overdue or urgent words are used, otherwise 'medium'.
5. dueDateTime: ISO 8601 string when this task is due or when reminders should start. If no specific time is given, set it to 15 minutes from now. If "in 5 minutes", calculate from current time. If "tomorrow at 9am", compute the date.
6. nagCadence: How frequently the agent should nag until it is marked done. Must be one of: '1m', '2m', '5m', '10m', '15m', '30m', '1h', 'escalating'. Default to '5m' if not specified, or '1m'/'2m' if urgent.
7. soundAlert: boolean (default true).
8. voiceAlert: boolean (default true).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            priority: { type: Type.STRING },
            dueDateTime: { type: Type.STRING, description: 'ISO 8601 timestamp string' },
            nagCadence: { type: Type.STRING },
            soundAlert: { type: Type.BOOLEAN },
            voiceAlert: { type: Type.BOOLEAN },
          },
          required: ['title', 'category', 'priority', 'dueDateTime', 'nagCadence', 'soundAlert', 'voiceAlert'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, task: parsed });
  } catch (error: any) {
    console.error('Error parsing task:', error);
    res.status(500).json({ error: error.message || 'Failed to parse task with AI' });
  }
});

// AI Endpoint 2: Generate dynamic reminder message based on overdue duration, persona & reminder level
app.post('/api/agent/generate-nag', async (req: Request, res: Response) => {
  try {
    const { taskTitle, overdueMinutes, reminderCount, persona, snoozeCount } = req.body;

    const personaDescriptions: Record<string, string> = {
      drill_sergeant: 'A strict, tough-love military drill instructor who yells with discipline, urgency, zero excuses, and commands action.',
      assertive_assistant: 'An ultra-efficient, no-nonsense executive assistant who is firm, direct, polite yet uncompromising about deadlines.',
      supportive_coach: 'An encouraging, empathetic high-performance coach who cheers the user on, provides momentum, and asks for 2 minutes of focus.',
      witty_roaster: 'A funny, sarcastic, dry-witted companion who lovingly teases the user for procrastination and makes lighthearted roasts.',
      zen_monk: 'A calm, deeply grounded mindfulness guide reminding you that unfinished obligations clutter the mind and action brings peace.',
    };

    const personaDesc = personaDescriptions[persona] || personaDescriptions.assertive_assistant;

    const prompt = `You are a relentless personal reminder agent. Your mission is to remind the user about their unfinished task until they mark it done.
Task Title: "${taskTitle}"
Minutes Overdue: ${overdueMinutes || 0}
Number of times already reminded: ${reminderCount || 1}
Number of times snoozed: ${snoozeCount || 0}
Your Persona: ${personaDesc}

Generate:
1. shortNag: A punchy 1-2 sentence spoken reminder message (under 30 words) to speak or show immediately.
2. actionableTip: A 1-sentence prompt to eliminate resistance and take immediate action right now.
3. urgencyLevel: 'gentle' | 'firm' | 'urgent' | 'relentless' based on how overdue and how many times reminded.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shortNag: { type: Type.STRING },
            actionableTip: { type: Type.STRING },
            urgencyLevel: { type: Type.STRING },
          },
          required: ['shortNag', 'actionableTip', 'urgencyLevel'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, reminder: parsed });
  } catch (error: any) {
    console.error('Error generating nag:', error);
    res.status(500).json({ error: error.message || 'Failed to generate nag' });
  }
});

// AI Endpoint 3: Break down a procrastinated task into micro-steps
app.post('/api/agent/micro-steps', async (req: Request, res: Response) => {
  try {
    const { taskTitle, taskDescription } = req.body;
    if (!taskTitle) {
      res.status(400).json({ error: 'taskTitle is required' });
      return;
    }

    const prompt = `The user is procrastinating on this task: "${taskTitle}" (${taskDescription || 'No description'}).
Generate 3 ultra-small, low-friction "Micro-Steps" (under 60 seconds each) that will get the user immediately started so they can mark it done.
Make step 1 absurdly easy (e.g. "Open the document" or "Grab a pen").`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 micro-steps',
            },
            encouragement: { type: Type.STRING },
          },
          required: ['steps', 'encouragement'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, result: parsed });
  } catch (error: any) {
    console.error('Error generating micro-steps:', error);
    res.status(500).json({ error: error.message || 'Failed to generate micro-steps' });
  }
});

// AI Endpoint 4: Voice synthesis via gemini-3.8-flash-lite-tts
app.post('/api/agent/speak', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Kore' } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    // Supported voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    const allowedVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const selectedVoice = allowedVoices.includes(voiceName) ? voiceName : 'Kore';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 300), // Keep concise for snappy reminders
              speechMetadata: {
                style: 'Clear, direct, assertive personal assistant',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({
        success: true,
        audioData: `data:audio/wav;base64,${base64Audio}`,
      });
    } else {
      res.status(500).json({ error: 'No audio returned from Gemini TTS' });
    }
  } catch (error: any) {
    console.error('Error in TTS generation:', error);
    res.status(500).json({ error: error.message || 'TTS generation failed' });
  }
});

// Mount Vite or static serving
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TaskSentinel RemindMe Server running at http://0.0.0.0:${PORT}`);
});
