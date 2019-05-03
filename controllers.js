const twilio = require("twilio");
const moment = require("moment");
const momentTz = require("moment-timezone");
const uniqid = require("uniqid");
const redis = require("redis");
const redisPub = redis.createClient();

const { accountSid, authToken, publicUrl, fromNumber, agentNumber } = require("./config");
const twilioClient = twilio(accountSid, authToken);
const voiceResponse = twilio.twiml.VoiceResponse;

exports.customerenqueue = async (req, res, next) => {
  try {
    const hour = momentTz()
      .tz("Europe/London")
      .format("HH");

    const roomName = uniqid();

    const twilioVoiceResponse = new voiceResponse();

    if (hour === 0 || hour < 12) {
      response = "Morning";
    } else if (hour <= 19) {
      response = "Afternoon";
    } else {
      response = "Evening";
    }

    const Greeting = `Good ${response}!   
        Your call is very important to us. 
        Please wait for the next available
        Agent`;

    if (response === "Morning") {
      await twilioVoiceResponse.say(Greeting);
      await twilioVoiceResponse.enqueue({}, roomName);
      await redisPub.publish("room name", roomName);

      res.type("text/xml");
      return res.send(twilioVoiceResponse.toString());
    } else if (response === "Afternoon") {
      await twilioVoiceResponse.say(Greeting);
      await twilioVoiceResponse.enqueue({}, roomName);
      await redisPub.publish("room name", roomName);

      res.type("text/xml");
      return res.send(twilioVoiceResponse.toString());
    } else if (response === "Evening") {
      await twilioVoiceResponse.say(Greeting);
      await twilioVoiceResponse.enqueue({}, roomName);
      await redisPub.publish("room name", roomName);

      res.type("text/xml");
      return res.send(twilioVoiceResponse.toString());
    }
  } catch (error) {
    return next(error);
  }
};

exports.agentdequeue = async (req, res, next) => {
  try {
    const { roomName } = req.query;

    await twilioClient.calls.create({
      from: fromNumber,
      to: agentNumber,
      url: `${publicUrl}/agentgather?roomName=${roomName}`
    });

    return res.json({
      success: true
    });
  } catch (error) {
    return next(error);
  }
};

exports.agentgather = async (req, res, next) => {
  try {
    const { roomName } = req.query;

    const twilioVoiceResponse = new voiceResponse();

    const gather = twilioVoiceResponse.gather({
      action: `${publicUrl}/agentprocess?roomName=${roomName}`,
      method: "POST",
      numDigits: 1
    });

    gather.say("Please press 1 to accept the call!");
    gather.pause({ length: 5 });
    gather.say("Please press 2 to forward the call to Voice Mail!");
    gather.pause({ length: 5 });
    gather.say("Please press 1 to accept the call!");
    gather.pause({ length: 5 });
    gather.say("Please press 2 to forward the call to Voice Mail!");
    gather.pause({ length: 5 });
    twilioVoiceResponse.say("We didn't receive any input. Goodbye!");

    res.type("text/xml");
    return res.send(twilioVoiceResponse.toString());
  } catch (error) {
    return next(error);
  }
};

exports.agentprocess = async (req, res, next) => {
  try {
    const { roomName } = req.query;
    const { Digits } = req.body;

    const twilioVoiceResponse = new voiceResponse();

    const Digit = Number(Digits);

    if (Digit === 1) {
      twilioVoiceResponse.say("You'll be connected with the customer shortly");

      const dial = twilioVoiceResponse.dial();
      dial.queue({}, roomName);

      res.type("text/xml");
      return res.send(twilioVoiceResponse.toString());
    } else {
      twilioVoiceResponse.say(
        "The customer will be redirected with a voice mail"
      );

      res.type("text/xml");
      return res.send(twilioVoiceResponse.toString());
    }
  } catch (error) {
    return next(error);
  }
};
