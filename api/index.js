const express = require('express')
const cors = require('cors')
const { kv } =  require("@vercel/kv");

const app = express();
app.use(cors());
const PORT = 5000;

const dataSetKey = "data"
const lastOpenedDataKey = "lastOpened"

async function hasOpenedToday() {
  const lastOpenedData = await kv.hget(dataSetKey, lastOpenedDataKey);
  const currentTime = new Date();
  const resetTime = new Date();
  resetTime.setUTCHours(8, 0, 0, 0); // 10 AM GMT+2 is 8 AM UTC

  if (currentTime < resetTime) {
    resetTime.setUTCDate(resetTime.getUTCDate() - 1); // Go back one day if current time is before reset time
  }

  const lastOpenedDate = new Date(lastOpenedData);
  return lastOpenedDate >= resetTime;
}

app.get("/api/images/:boxType", async (req, res) => {
  const { boxType } = req.params;
  const data = await kv.hget(dataSetKey, boxType);

  if (data) {
    return res.status(400).json({ error: "Invalid box type" });
  }

  res.json(data);
});

app.post("/api/images/:boxType", async (req, res) => {
  const { boxType } = req.params;
  const { imageUrl } = req.body;

  console.log(req);

  if (hasOpenedToday()) {
    return res.status(403).json({
      error:
        "You have already opened a box today. Please try again tomorrow after 10 AM GMT+2.",
    });
  }

  if (!imageUrl) {
    return res.status(400).json({ error: "Image URL is required" });
  }

  const data = await kv.hget(boxType);



  if (data === "") {
      // Update the opened images and the last opened date
await kv.hset(dataSetKey, boxType, data.concat("", imageUrl))
await kv.hset(dataSetKey, lastOpenedDataKey, new Date().toISOString())
  }

  if (!data) {
    return res.status(400).json({ error: "Invalid box type" });
  }

        // Update the opened images and the last opened date
await kv.hset(dataSetKey, boxType, data.concat(",", imageUrl))
await kv.hset(dataSetKey, lastOpenedDataKey, new Date().toISOString())






  res.status(201).json({ message: "Image URL saved successfully" });
});

app.get("/api/can-open-box", (req, res) => {
  const canOpen = !hasOpenedToday();
  res.json({ canOpen });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;