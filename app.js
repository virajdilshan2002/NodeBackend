import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import router from "./scripts/testRoutes copy.js";
import orgRouter from "./scripts/organizationRoutes.js";
import voucherRouter from "./scripts/voucherRoutes.js";
import organizationsFindRouter from "./scripts/organizationsFind.js";
import productionFindRouter from "./scripts/productionFindRoutes.js";
import ScriptedFind from "./scripts/productionFindRoutes-2.js";
import invoiceRoutes from "./scripts/invoiceRoutes.js";


import shortVoucherRoutes from "./scripts/shortVoucher.js";
import invoiceBalanceUpdate from "./scripts/prodInvoicesBalanceUpdateRoutes.js";

dotenv.config();
const port = 3009;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*" }));
// app.use("/reports-api/test", router);
// app.use("/organizations-api/test", orgRouter);
// app.use("/vouchers-api/test", voucherRouter);
// app.use("/organizations-find/test", organizationsFindRouter);
// app.use("/prod-find/test", productionFindRouter);
// app.use("/vou-find/test", ScriptedFind);
// app.use("/invoice-api/test", invoiceRoutes);
// app.use("/prod-booking/copy", shortVoucherRoutes);
app.use("/prod-invoice/test", invoiceBalanceUpdate);

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});
