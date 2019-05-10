/* eslint-disable no-unused-vars */
const hari = {
  accountSid: "ACa6d9bba9c1466efc33dc4bfc3e0a859b",
  authToken: "b3ae681d72ca2e7899307c002794124d",
  apikey:
    "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",
  // publicUrl: "http://3.9.84.191:3030",
  publicUrl: "http://00f91e27.ngrok.io",
  fromNumber: "+12818494760",
  // agentNumbers: ["+919865455219", "+918220224655"],
  agentNumbers: ["+919865455219"],
  // agentSips: ['sip:jack@example.com'],
  agentSips: [],
  customerMaximumWaitTimeinSeconds: 60,
  maximumVoiceRecordInSeconds: 15,
  customerWaitingAnnounceInSeconds: 20,
  fromEmail: "mrhasanali01@gmail.com",
  toEmail: "iharivijay@gmail.com"
};

const shazad = {
  accountSid: "AC70af65fbf83bc95f0249c14e268049b8",
  authToken: "82ecfad55661ecc05f8e8176e9e47dbc",
  apikey:
    "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",
  publicUrl: "http://55.56.154.227",
  fromNumber: "+447588688961",
  // agentNumbers: ["+44986554321", "+448220226775"],
  agentNumbers: [], //This numbers are must. Atleast one number to handle.
   // agentSips: ['sip:jack@example.com'],
  agentSips: [],
  customerMaximumWaitTimeinSeconds: 60,
  maximumVoiceRecordInSeconds: 15,
  customerWaitingAnnounceInSeconds: 20,
  fromEmail: "mrhasanali01@gmail.com",
  toEmail: "" //This email is must to receive Mail notification
};

const template = {
  accountSid: "YOUR_TWILIO_ACCOUNT_SID",
  authToken: "YOUR_TWILIO_AUTH_TOKEN",
  apikey: "YOUR_SENDIN_BLUE_API_KEY",
  publicUrl: "PUBLIC_URL_OF_APP",
  fromNumber: "YOUR_TWILIO_FROM_NUMBER",
  agentNumberS: ["ARRAY_OF_AGENT_TO_NUMBERS"],
  agentSips: ["ARRAY_OF_AGENT_TO_SIPS"],
  customerMaximumWaitTimeinSeconds: 60, //Time in seconds when Customer will be automatically redirected to voice mail
  maximumVoiceRecordInSeconds: 15, //Time in seconds how long a customer voice mail is recorded.
  customerWaitingAnnounceInSeconds: 20, //Announcing Customer to get a Call back after customer enqueued in call say after 20 seconds.
  fromEmail: "YOUR_SEND_IN_BLUE_FROM_EMAIL",
  toEmail: "YOUR_EMAIL_TO_RECEIVE_NOTIFICATION"
};

module.exports = hari;
