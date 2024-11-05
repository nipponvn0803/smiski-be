const express = require("express");
const cors = require("cors");
const { kv } = require("@vercel/kv");

const app = express();
app.use(cors());

const dataSetKey = "data";
const lastOpenedDataKey = "lastOpened";

async function hasOpenedToday() {
  const lastOpenedData = await kv.hget(dataSetKey, lastOpenedDataKey);
  console.log("lastOpenedData", lastOpenedData);
  const currentTime = new Date();
  const lastOpenedDate = new Date(lastOpenedData);
  console.log("lastOpenedDate", lastOpenedDate);
  return lastOpenedDate >= currentTime;
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
  if (!data) {
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
