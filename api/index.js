const express = require("express");
const cors = require("cors");
const { kv } = require("@vercel/kv");

const app = express();
app.use(cors());

const dataSetKey = "data";
const lastOpenedDataKey = "lastOpened";

async function hasOpenedToday() {
  try {
    const lastOpenedData = await kv.hget(dataSetKey, lastOpenedDataKey);
    
    if (!lastOpenedData) {
      // If no data is found, return false or handle accordingly
      console.log("No last opened data found.");
      return false;
    }
    
    console.log("lastOpenedData", lastOpenedData);
    
    const lastOpenedDate = new Date(lastOpenedData);
    const currentTime = new Date();
    
    // Create dates representing the start of the day for comparison
    const startOfToday = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1); // End of today

    console.log("lastOpenedDate", lastOpenedDate);
    
    // Check if the lastOpenedDate falls within today
    return lastOpenedDate >= startOfToday && lastOpenedDate < endOfToday;
  } catch (error) {
    console.error("Error checking last opened date:", error);
    return false; // Return false or handle the error as needed
  }
}

async function debugFunction() {
  const lastOpenedData = await kv.hget(dataSetKey, lastOpenedDataKey);
  const currentTime = new Date();
  const lastOpenedDate = new Date(lastOpenedData);
  const comparision = lastOpenedDate >= currentTime;
  return {
    lastOpenedData,
    lastOpenedDate,
    currentTime,
    comparision,
  };
}

app.get("/api/images/:boxType", async (req, res) => {
  const boxType = req.params.boxType;
  const data = await kv.hget(dataSetKey, boxType);
  console.log("GET endpoint", boxType);
  console.log("GET endpoint data", data);
  if (!data && data !== "") {
    return res.status(400).json({ error: "Invalid box type" });
  }

  return res.json(data);
});

app.post("/api/images/:boxType", async (req, res) => {
  const boxType = req.params.boxType;
  const imageUrl = req.body.imageUrl;

  console.log(req);

  if (!imageUrl) {
    return res.status(400).json({ error: "Image URL is required" });
  }
  console.log("boxType", boxType);

  const data = await kv.hget(dataSetKey, boxType);
  console.log(boxType, data);

  if (!data && data !== "") {
    return res.status(400).json({ error: "Invalid box type" });
  }

  if (data === "") {
    // Update the opened images and the last opened date
    await kv.hset(dataSetKey, {
      [boxType]: imageUrl,
      [lastOpenedDataKey]: new Date().toISOString(),
    });

    return res.status(201).json({ message: "Image URL saved successfully" });
  }

  const concatURL = data + "," + imageUrl;
  // Update the opened images and the last opened date
  await kv.hset(dataSetKey, {
    [boxType]: concatURL,
    [lastOpenedDataKey]: new Date().toISOString(),
  });

  return res.status(201).json({ message: "Image URL saved successfully" });
});

app.get("/api/can-open-box", async (req, res) => {
  const openedToday = await hasOpenedToday();
  const debugValue = await debugFunction();
  return res.json({ canOpen: !openedToday, ...debugValue });
});

app.get("/", (req, res) => res.send("Express on Vercel123"));

app.listen(3000, () => {
  console.log(`Server is running on http://localhost:3000`);
});

const allowCors = (fn) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  // another common pattern
  // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

module.exports = allowCors(app);
