/* eslint-disable no-console */
const twilio = require("twilio");
// eslint-disable-next-line no-unused-vars
const moment = require("moment");
const momentTz = require("moment-timezone");
const uniqid = require("uniqid");
const Redis = require("ioredis");
const redisPub = new Redis();
const request = require("request");

const {
  accountSid,
  authToken,
  apikey,
  publicUrl,
  fromNumber,
  agentNumbers,
  agentSips,
  customerMaximumWaitTimeinSeconds,
  maximumVoiceRecordInSeconds,
  customerWaitingAnnounceInSeconds,
  fromEmail,
  toEmail
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
    await twilioVoiceResponse.enqueue(
      {
        waitUrl: `${publicUrl}/customerwaiturlgather?roomName=${roomName}`,
        action: `${publicUrl}/customerenqueueaction?roomName=${roomName}`
      },
      roomName
    );

    await redisPub.publish("room name", roomName);

    res.type("text/xml");
    return res.send(twilioVoiceResponse.toString());
  } catch (error) {
    return next(error);
  }
};

exports.customerenqueueaction = async (req, res, next) => {
  try {
    const { roomName } = req.query;
    const { QueueResult, QueueTime } = req.body;

    const callerNumber = await redisPub.get(`$callernumber${roomName}`);

    if (QueueResult === "hangup") {
      const roomCalls = await redisPub.lrange(roomName, 0, -1);
      await roomCalls.forEach(async call => {
        await twilioClient.calls(call).update({ status: "completed" });
      });

      var options = {
        method: "POST",
        url: "https://api.sendinblue.com/v3/smtp/email",
        headers: {
          "api-key": apikey,
          "Content-Type": "application/json"
        },
        body: {
          sender: { email: fromEmail },
          to: [{ email: toEmail }],
          textContent: `You have a missed call from ${callerNumber} ringing for ${QueueTime} seconds. Please check your call logs.`,
          subject: "Customer Missed Call",
          "replyTo.email": fromEmail
        },
        json: true
      };

      request(options, function(error, response, body) {
        if (error) throw new Error(error);

        return res.json({
          success: true
        });
      });
    } else if (QueueResult === "leave") {
      const twilioVoiceResponse = new voiceResponse();

      await twilioVoiceResponse.redirect(`${publicUrl}/customerrecordprocess`);

      res.type("text/xml");
      return res.send(twilioVoiceResponse.toString());
    } else if (QueueResult === "redirected") {
      const twilioVoiceResponse = new voiceResponse();

      await twilioVoiceResponse.say(
        "You will be automatically redirected to our voicemail."
      );
      await twilioVoiceResponse.redirect(`${publicUrl}/customerrecordprocess`);

      res.type("text/xml");
      return res.send(twilioVoiceResponse.toString());
    } else if (QueueResult === "bridged") {
      const twilioVoiceResponse = new voiceResponse();

      await twilioVoiceResponse.say("Thank you for calling us.");
      res.type("text/xml");
      return res.send(twilioVoiceResponse.toString());
    }
  } catch (error) {
    return next(error);
  }
};

exports.customerrecordprocess = async (req, res, next) => {
  try {

    const { IsRedirected } = req.query;

    const twilioVoiceResponse = new voiceResponse();

    await twilioVoiceResponse.pause({ length: 1 });
    if(IsRedirected == "True"){
      await twilioVoiceResponse.say("You will be automatically redirected to our voicemail")
      await twilioVoiceResponse.pause({ length: 1 });
    }
    await twilioVoiceResponse.say("Please record your message after the Beep.");
    await twilioVoiceResponse.record({
      action: `${publicUrl}/customerrecordaction`,
      recordingStatusCallback: `${publicUrl}/customerrecordcallback`,
      maxLength: maximumVoiceRecordInSeconds
    });

    res.type("text/xml");
    return res.send(twilioVoiceResponse.toString());
  } catch (error) {
    return next(error);
  }
};

exports.customerwaiturlgather = async (req, res, next) => {
  try {
    const { QueueTime, QueueSid } = req.body;

    const { roomName } = req.query;

    var callerNumber = await redisPub.get(`$callernumber${roomName}`);

    if(!callerNumber){

      const QueueMembers = await twilioClient.queues(QueueSid).members.list({limit: 20});

      const FirstQueueMemeber = await QueueMembers.filter(function(item){
        return item.position == 1;
      })

      const customerCallSid = await FirstQueueMemeber[0].callSid;

      const callDetails = await twilioClient.calls(customerCallSid).fetch()

      callerNumber = callDetails.from;

      await redisPub.set(`$callernumber${roomName}`,callerNumber);

    }

    const twilioVoiceResponse = new voiceResponse();

    if (QueueTime > customerMaximumWaitTimeinSeconds) {
      await twilioVoiceResponse.say(
        "It's been a  while. You will be automatically redirected to our voicemail."
      );
      await twilioVoiceResponse.leave();

      res.type("text/xml");
      return res.send(twilioVoiceResponse.toString());
    } else {
      const gather = twilioVoiceResponse.gather({
        action: `${publicUrl}/customerwaiturlprocess?roomName=${roomName}`,
        method: "POST",
        numDigits: 1
      });

      await gather.pause({ length: customerWaitingAnnounceInSeconds });
      await gather.say("Please press 2 to receive a callback");

      res.type("text/xml");
      return res.send(twilioVoiceResponse.toString());
    }
  } catch (error) {
    return next(error);
  }
};

exports.customerwaiturlprocess = async (req, res, next) => {
  try {
    const { Digits } = req.body;
    const { roomName } = req.query;

    const twilioVoiceResponse = new voiceResponse();

    const Digit = Number(Digits);

    if (Digit === 2) {
      await twilioVoiceResponse.say(
        "You'll be connected with our voicemail shortly"
      );
      await twilioVoiceResponse.leave();

      res.type("text/xml");
      return res.send(twilioVoiceResponse.toString());
    } else {
      await twilioVoiceResponse.say("Sorry. That is a wrong input.");
      await twilioVoiceResponse.redirect(`${publicUrl}/customerwaiturlgather?roomName=${roomName}`);

      res.type("text/xml");
      return res.send(twilioVoiceResponse.toString());
    }
  } catch (error) {
    return next(error);
  }
};

exports.customerrecordaction = async (req, res, next) => {
  try {
    const twilioVoiceResponse = new voiceResponse();
    await twilioVoiceResponse.say(
      "Thank you. Our Agent will get back to you shortly"
    );

    res.type("text/xml");
    return res.send(twilioVoiceResponse.toString());
  } catch (error) {
    return next(error);
  }
};

exports.customerrecordcallback = async (req, res, next) => {
  try {
    const { RecordingUrl, CallSid } = req.body;

    const callDetails = await twilioClient.calls(CallSid).fetch();

    const fromNumber = callDetails.from;

    var options = {
      method: "POST",
      url: "https://api.sendinblue.com/v3/smtp/email",
      headers: {
        "api-key": apikey,
        "Content-Type": "application/json"
      },
      body: {
        sender: { email: fromEmail },
        to: [{ email: toEmail }],
        textContent: `You received a voicemail ${RecordingUrl}.mp3 from ${fromNumber}`,
        subject: "Voice Mail",
        "replyTo.email": fromEmail
      },
      json: true
    };

    request(options, function(error, response, body) {
      if (error) throw new Error(error);

      return res.json({
        success: true
      });
    });
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

    const gather = await twilioVoiceResponse.gather({
      action: `${publicUrl}/agentprocess?roomName=${roomName}`,
      method: "POST",
      numDigits: 1
    });

    await gather.say("Please press 1 to accept the call!");
    await gather.pause({ length: 5 });
    await gather.say("Please press 2 to forward the call to Voice Mail!");
    await gather.pause({ length: 5 });
    await gather.say("Please press 1 to accept the call!");
    await gather.pause({ length: 5 });
    await gather.say("Please press 2 to forward the call to Voice Mail!");
    await gather.pause({ length: 5 });
    await twilioVoiceResponse.say("We didn't receive any input. Goodbye!");

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
      await twilioVoiceResponse.say(
        "You'll be connected with the customer shortly"
      );

      const dial = await twilioVoiceResponse.dial();
      dial.queue({}, roomName);

      res.type("text/xml");
      return res.send(twilioVoiceResponse.toString());
    } else if (Digit === 2) {
      await twilioVoiceResponse.say(
        "The customer will be redirected to voice mail"
      );

      const queueList = await twilioClient.queues.list();

      const currentQueue = await queueList.filter(function(item) {
        return item.friendlyName === roomName;
      });

      const currentQueueSid = currentQueue[0].sid;

      const memberList = await twilioClient
        .queues(currentQueueSid)
        .members.list();

      const activeMember = await memberList.filter(function(item) {
        return item.position == 1;
      });

      const activeMemberCallSid = activeMember[0].callSid;

      await twilioClient
        .queues(currentQueueSid)
        .members(activeMemberCallSid)
        .update({ url: `${publicUrl}/customerrecordprocess?IsRedirected=True`, method: "POST" });

      await twilioVoiceResponse.hangup();

      res.type("text/xml");
      return res.send(twilioVoiceResponse.toString());
    } else {
      twilioVoiceResponse.say("Sorry. That is a wrong input.");
      await twilioVoiceResponse.redirect(
        `${publicUrl}/agentgather?roomName=${roomName}`
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
