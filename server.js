import express from 'express';
import { kv } from "@vercel/kv";

const app = express();
const PORT = 5000;

async function hasOpenedToday() {
  const data = await JSON.parse(kv.hGetAll("data"));
  const currentTime = new Date();
  const resetTime = new Date();
  resetTime.setUTCHours(8, 0, 0, 0); // 10 AM GMT+2 is 8 AM UTC

  if (currentTime < resetTime) {
    resetTime.setUTCDate(resetTime.getUTCDate() - 1); // Go back one day if current time is before reset time
  }

  const lastOpenedDate = new Date(data.latsOpened.date);
  return lastOpenedDate >= resetTime;
}

app.get("/api/images/:boxType", async (req, res) => {
  const { boxType } = req.params;
  const data = await kv.hGetAll("data");

  if (!data[boxType]) {
    return res.status(400).json({ error: "Invalid box type" });
  }

  res.json(data[boxType]);
});

app.post("/api/images/:boxType", async (req, res) => {
  const { boxType } = req.params;
  const { imageUrl } = req.body;

  if (hasOpenedToday()) {
    return res.status(403).json({
      error:
        "You have already opened a box today. Please try again tomorrow after 10 AM GMT+2.",
    });
  }

  if (!imageUrl) {
    return res.status(400).json({ error: "Image URL is required" });
  }

  const data = await kv.hGetAll("data");

  if (!data[boxType]) {
    return res.status(400).json({ error: "Invalid box type" });
  }

  // Update the opened images and the last opened date
  data[boxType].push(imageUrl);
  data.lastOpened = {
    date: new Date().toISOString(),
  };

  await kv.hSet("data", JSON.stringify(data));

  res.status(201).json({ message: "Image URL saved successfully" });
});

app.get("/api/can-open-box", (req, res) => {
  const canOpen = !hasOpenedToday();
  res.json({ canOpen });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
