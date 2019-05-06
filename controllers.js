/* eslint-disable no-console */
const twilio = require("twilio");
// eslint-disable-next-line no-unused-vars
const moment = require("moment");
const momentTz = require("moment-timezone");
const uniqid = require("uniqid");
const Redis = require("ioredis");
const redisPub = new Redis();

const {
  accountSid,
  authToken,
  publicUrl,
  fromNumber,
  agentNumbers,
  agentSips
} = require("./config");
const twilioClient = twilio(accountSid, authToken);
const voiceResponse = twilio.twiml.VoiceResponse;

exports.customerenqueue = async (req, res, next) => {
  try {
    const hour = momentTz()
      .tz("Europe/London")
      .format("HH");

    const roomName = uniqid();
    const twilioVoiceResponse = new voiceResponse();

    var response = "";

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

    await twilioVoiceResponse.say(Greeting);
    await twilioVoiceResponse.enqueue({}, roomName);
    await redisPub.publish("room name", roomName);

    res.type("text/xml");
    return res.send(twilioVoiceResponse.toString());
  } catch (error) {
    return next(error);
  }
};

exports.agentdequeue = async (req, res, next) => {
  try {
    const { roomName } = req.query;

    const agentContacts = [...agentNumbers, ...agentSips];

    await agentContacts.forEach(async contact => {
      const call = await twilioClient.calls.create({
        from: fromNumber,
        to: contact,
        url: `${publicUrl}/agentgather?roomName=${roomName}`,
        statusCallback: `${publicUrl}/terminatecalls?roomName=${roomName}`,
        statusCallbackEvent: ["answered"],
        statusCallbackMethod: "POST"
      });

      await redisPub.rpush(roomName, call.sid);
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

exports.terminatecalls = async (req, res, next) => {
  try {
    const { roomName } = req.query;
    const { CallSid } = req.body;

    await redisPub.lrem(roomName, 0, CallSid);
    const roomCalls = await redisPub.lrange(roomName, 0, -1);

    await roomCalls.forEach(async call => {
      await twilioClient.calls(call).update({ status: "completed" });
    });

    await redisPub.del(roomName);

    return res.json({
      success: true
    });
  } catch (error) {
    return next(error);
  }
};
