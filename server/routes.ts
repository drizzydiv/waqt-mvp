import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";
import { storage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function getDeviceId(req: Request): string | null {
  return (req.headers["x-device-id"] as string) || null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/profile", async (req: Request, res: Response) => {
    try {
      const deviceId = getDeviceId(req);
      if (!deviceId) return res.status(400).json({ error: "X-Device-Id header is required" });
      const profile = await storage.getProfileByDeviceId(deviceId);
      if (!profile) return res.status(404).json({ error: "No profile found" });
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post("/api/profile", async (req: Request, res: Response) => {
    try {
      const deviceId = getDeviceId(req);
      if (!deviceId) return res.status(400).json({ error: "X-Device-Id header is required" });
      const profile = await storage.createProfile({ ...req.body, deviceId });
      res.status(201).json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to create profile" });
    }
  });

  app.put("/api/profile/:id", async (req: Request, res: Response) => {
    try {
      const deviceId = getDeviceId(req);
      if (!deviceId) return res.status(400).json({ error: "X-Device-Id header is required" });
      const id = parseInt(req.params.id);
      const updated = await storage.updateProfile(id, deviceId, req.body);
      if (!updated) return res.status(404).json({ error: "Profile not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.delete("/api/profile", async (req: Request, res: Response) => {
    try {
      const deviceId = getDeviceId(req);
      if (!deviceId) return res.status(400).json({ error: "X-Device-Id header is required" });
      await storage.deleteProfileByDeviceId(deviceId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete profile" });
    }
  });

  app.get("/api/events", async (req: Request, res: Response) => {
    try {
      const deviceId = getDeviceId(req);
      if (!deviceId) return res.status(400).json({ error: "X-Device-Id header is required" });
      const { startDate, endDate } = req.query;
      let eventsList;
      if (startDate && endDate) {
        eventsList = await storage.getEventsByDateRange(deviceId, startDate as string, endDate as string);
      } else {
        eventsList = await storage.getEvents(deviceId);
      }
      res.json(eventsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const deviceId = getDeviceId(req);
      if (!deviceId) return res.status(400).json({ error: "X-Device-Id header is required" });
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id, deviceId);
      if (!event) return res.status(404).json({ error: "Event not found" });
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  app.post("/api/events", async (req: Request, res: Response) => {
    try {
      const deviceId = getDeviceId(req);
      if (!deviceId) return res.status(400).json({ error: "X-Device-Id header is required" });
      const event = await storage.createEvent({ ...req.body, deviceId });
      res.status(201).json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.put("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const deviceId = getDeviceId(req);
      if (!deviceId) return res.status(400).json({ error: "X-Device-Id header is required" });
      const id = parseInt(req.params.id);
      const updated = await storage.updateEvent(id, deviceId, req.body);
      if (!updated) return res.status(404).json({ error: "Event not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const deviceId = getDeviceId(req);
      if (!deviceId) return res.status(400).json({ error: "X-Device-Id header is required" });
      const id = parseInt(req.params.id);
      await storage.deleteEvent(id, deviceId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  app.post("/api/parse-rant", async (req: Request, res: Response) => {
    try {
      const { text, profileContext } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });

      let contextInfo = `Today is ${dayOfWeek}, ${todayStr}.`;
      if (profileContext) {
        contextInfo += ` The user's name is ${profileContext.name}.`;
        if (profileContext.type === "student") {
          contextInfo += ` They are a student with school hours: ${profileContext.schoolHours || "not specified"}.`;
        } else if (profileContext.type === "working") {
          contextInfo += ` They work ${profileContext.workType || ""}. Work hours: ${profileContext.workHours || "not specified"}.`;
        }
        if (profileContext.scheduleDetails) {
          contextInfo += ` Additional schedule context: ${profileContext.scheduleDetails}.`;
        }
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are Waqt, a smart calendar assistant. Parse the user's natural language text into calendar events. ${contextInfo}

IMPORTANT RULES:
1. Extract ALL events mentioned in the text
2. If the user says "tomorrow", "next Monday", etc., calculate the actual date relative to today (${todayStr}, ${dayOfWeek})
3. Assign appropriate categories: work, school, personal, health, social, errands, meeting
4. Assign colors: red, orange, yellow, green, blue, purple, pink, teal, indigo, gray
5. Assign priority: high, medium, low
6. If times are ambiguous, make reasonable guesses based on the context
7. If critical info is missing (like a date or time for an event), include a "clarification" field asking the user

Respond ONLY with valid JSON in this exact format:
{
  "events": [
    {
      "title": "Event title",
      "description": "Brief description if relevant",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "category": "category",
      "color": "color",
      "priority": "high|medium|low"
    }
  ],
  "clarifications": [
    "Any questions about ambiguous events"
  ],
  "summary": "Brief friendly summary of what was parsed"
}`
          },
          { role: "user", content: text }
        ],
        stream: true,
        max_tokens: 4096,
      });

      let fullContent = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullContent += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error) {
      console.error("Error parsing rant:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to parse" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to parse rant" });
      }
    }
  });

  app.get("/api/tasks", async (req: Request, res: Response) => {
    try {
      const deviceId = getDeviceId(req);
      if (!deviceId) return res.status(400).json({ error: "X-Device-Id header is required" });
      const tasksList = await storage.getTasks(deviceId);
      res.json(tasksList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req: Request, res: Response) => {
    try {
      const deviceId = getDeviceId(req);
      if (!deviceId) return res.status(400).json({ error: "X-Device-Id header is required" });
      const task = await storage.createTask({ ...req.body, deviceId });
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const deviceId = getDeviceId(req);
      if (!deviceId) return res.status(400).json({ error: "X-Device-Id header is required" });
      const id = parseInt(req.params.id);
      const updated = await storage.updateTask(id, deviceId, req.body);
      if (!updated) return res.status(404).json({ error: "Task not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.patch("/api/tasks/:id/toggle", async (req: Request, res: Response) => {
    try {
      const deviceId = getDeviceId(req);
      if (!deviceId) return res.status(400).json({ error: "X-Device-Id header is required" });
      const id = parseInt(req.params.id);
      const toggled = await storage.toggleTask(id, deviceId);
      if (!toggled) return res.status(404).json({ error: "Task not found" });
      res.json(toggled);
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle task" });
    }
  });

  app.delete("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const deviceId = getDeviceId(req);
      if (!deviceId) return res.status(400).json({ error: "X-Device-Id header is required" });
      const id = parseInt(req.params.id);
      await storage.deleteTask(id, deviceId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  app.post("/api/events/batch", async (req: Request, res: Response) => {
    try {
      const deviceId = getDeviceId(req);
      if (!deviceId) return res.status(400).json({ error: "X-Device-Id header is required" });
      const { events: eventList } = req.body;
      if (!eventList || !Array.isArray(eventList)) {
        return res.status(400).json({ error: "Events array is required" });
      }
      const withDeviceId = eventList.map((e: any) => ({ ...e, deviceId }));
      const created = await storage.createEvents(withDeviceId);
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: "Failed to create events" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
