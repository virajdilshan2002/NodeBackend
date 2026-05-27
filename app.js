import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import router from "./scripts/testRoutes copy.js";
import orgRouter from "./scripts/organizationRoutes.js";
import voucherRouter from "./scripts/voucherRoutes.js";

dotenv.config();
const port = 3009;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*" }));
app.use("/reports-api/test", router);
app.use("/organizations-api/test", orgRouter);
app.use("/vouchers-api/test", voucherRouter);

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});
