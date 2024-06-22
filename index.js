const express = require("express");
const fetch = require("node-fetch");
const redis = require("redis");

const PORT = process.env.PORT || 8000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const client = redis.createClient({
  host: "localhost",
  port: REDIS_PORT,
});

const app = express();

client.on("error", (err) => console.log("Redis Client Error", err));
client.connect();

const setResponse = (username, repos) => {
  return `<h2>${username} has ${repos} Github repos</h2>`;
};

const getRepos = async (req, res, next) => {
  try {
    console.log("Fetching Data");
    const { username } = req.params;
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();
    const repos = data.public_repos;

    // console.log(client);

    client.set(username, repos, {
      EX: 10,
    });

    res.send(setResponse(username, repos));
  } catch (e) {
    console.log(e);
    res.status(500);
  }
};
// cache middleware
const cache = async (req, res, next) => {
  const { username } = req.params;
  console.log("🚀 ~ cache ~ username", username);
  try {
    await client.get(username, (err, data) => {
      console.log("🚀 ~ client.get ~ data:", data);
      if (err) throw err;
      if (data !== null) {
        res.send(setResponse(username, data));
      } else {
        next();
      }
    });
  } catch (e) {
    console.log(e);
    res.status(500);
  }
  next();
};
app.get("/repo/:username", getRepos);

app.listen(PORT, async () => {
  console.log(`App listening on port ${PORT}`);
});
