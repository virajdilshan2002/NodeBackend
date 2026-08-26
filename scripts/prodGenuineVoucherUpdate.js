import express from "express";
import mysql from "mysql";
import async, { each, log } from "async";
import moment from "moment";
import Hashids from "hashids";

let hashids = new Hashids();

const router = express.Router();
let resultData;

const corporate = {
  host: "192.168.1.11",
  user: "kangaroo",
  password: "kan588",
  database: "corporate_master",
};

// const corporate = {
//   host: "192.168.1.10",
//   user: "usr_local",
//   password: "lobos681",
//   database: "corporate_master",
// };

router.get("/update-voucher-bookings", function (req, res) {
  const connectionMain = mysql.createConnection(corporate);

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      return res.json({
        success: false,
        error: err,
      });
    }

    const query = `
      UPDATE booking b
      INNER JOIN voucher_list vl
        ON vl.booking_id = b.id
      SET b.is_corporate_issued_voucher = 1
    `;

    connectionMain.query(query, function (err, result) {
      if (err) {
        connectionMain.end();

        return res.json({
          success: false,
          error: err,
        });
      }

      connectionMain.end();

      return res.json({
        success: true,
        message: "Completed successfully.",
        updated: result.affectedRows,
      });
    });
  });
});

export default router;