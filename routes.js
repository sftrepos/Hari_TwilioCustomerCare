const express = require("express");
const router = express.Router();
const controllers = require("./controllers");

router.route("/customerenqueue").post(controllers.customerenqueue);
router.route("/agentdequeue").post(controllers.agentdequeue);
router.route("/agentgather").post(controllers.agentgather);
router.route("/agentprocess").post(controllers.agentprocess);
router.route("/terminatecalls").post(controllers.terminatecalls);

router.route("/customerwaiturlgather").post(controllers.customerwaiturlgather);
router
  .route("/customerwaiturlprocess")
  .post(controllers.customerwaiturlprocess);
router
  .route("/customerrecordcallback")
  .post(controllers.customerrecordcallback);
router.route("/customerrecordaction").post(controllers.customerrecordaction);
router.route("/customerenqueueaction").post(controllers.customerenqueueaction);
router.route("/customerrecordprocess").post(controllers.customerrecordprocess);

module.exports = router;
