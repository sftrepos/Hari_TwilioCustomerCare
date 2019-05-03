const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const request = require("request");
const routes = require("./routes");
const { publicUrl } = require('./config');
const redis = require("redis");

const redisClient = redis.createClient();
const redisSub = redis.createClient();

redisClient.on("connect", function() {
  console.log("Redis client connected");
});

redisClient.on("error", function(err) {
  console.log("Something went wrong " + err);
});

redisSub.on("message", function(channel, message) {
  request.post(
    `${publicUrl}/agentdequeue?roomName=${message}`,
    function(err, res, body) {
      if (err) {
        console.log(err);
      }
      console.log("Dequed successfully");
    }
  );
});

redisSub.subscribe("room name");

const port = 3030;

const app = express();

app.use(morgan("combined"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/", routes);

app.listen(port, () => console.info(`server started on ${port}`));
