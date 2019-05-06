/* eslint-disable no-console */
const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const request = require("request");
const routes = require("./routes");
const { publicUrl } = require("./config");
const Redis = require("ioredis");

const redis = new Redis();
const redisSub = new Redis();

redis.on("connect", function() {
  console.log("Redis client connected");
});

redis.on("error", function(err) {
  console.log("Something went wrong " + err);
});

redisSub.on("message", function(channel, message) {
  request.post(
    `${publicUrl}/agentdequeue?roomName=${message}`,
    // eslint-disable-next-line no-unused-vars
    function(err, res, body) {
      if (err) {
        console.log(err);
      }
      console.log("Dequeing the call...");
    }
  );
});

/* redisSub.on("message", function(channel, message) {
  message = JSON.parse(message);

  console.log(message);
}); */

redisSub.subscribe("room name");
// redisSub.subscribe("framework");

const port = 3030;

const app = express();

app.use(morgan("combined"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/", routes);

app.listen(port, () => console.info(`server started on ${port}`));
