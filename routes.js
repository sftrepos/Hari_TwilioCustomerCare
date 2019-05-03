const express = require("express");
const router = express.Router();
const controllers = require("./controllers");

router.route("/customerenqueue").post(controllers.customerenqueue);
router.route("/agentdequeue").post(controllers.agentdequeue);
router.route("/agentgather").post(controllers.agentgather);
router.route("/agentprocess").post(controllers.agentprocess);

module.exports = router;
