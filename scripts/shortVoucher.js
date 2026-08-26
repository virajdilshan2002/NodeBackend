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

// const accountReports = {
//   host: "192.168.1.11",
//   user: "kangaroo",
//   password: "kan588",
//   database: "accounts_reports",
// };

// const corporate = {
//   host: "192.168.1.10",
//   user: "usr_local",
//   password: "lobos681",
//   database: "corporate_master",
// };

// const accountReports = {
//   host: "192.168.1.10",
//   user: "usr_local",
//   password: "lobos681",
//   database: "accounts_reports",
// };

// router.get("/short-voucher-numbers", function (req, res, next) {
//   const connectionMain = mysql.createConnection(corporate);
//   const connectionSecond = mysql.createConnection(accountReports);
//   let error = [];

//   connectionSecond.connect(function (err) {
//     if (err) {
//       connectionSecond.end();
//       res.json({ Data: "Error1" });
//     } else {
//       connectionSecond.query(
//         "SELECT b.refID, b.short_ref, b.voucherNumber FROM bookings b WHERE b.short_ref IS NOT NULL AND b.short_ref != ''",
//         function (err, result) {
//           connectionSecond.end();
//           if (err) {
//             res.json({ Data: err });
//           } else {
//             if (result && result.length) {
//               let resultData = JSON.stringify(result);
//               let json = JSON.parse(resultData);

//               // res.json({ Data: json });

//               if (json && json.length) {
//                 connectionMain.connect(function (err2) {
//                 if (err2) {
//                   connectionMain.end();
//                   return res.json({ error: err2 });
//                 }

//                 connectionMain.beginTransaction(function (transactionErr) {
//                   if (transactionErr) {
//                     connectionMain.end();
//                     return res.json({ error: transactionErr });
//                   }

//                   async.forEachSeries(
//                     json,
//                     function (returnObj, next) {
//                       const { refID, short_ref, voucherNumber } = returnObj;

//                       connectionMain.query(
//                         "SELECT * FROM booking WHERE ref_id = ?",
//                         [refID],
//                         function (findErr, booking) {
//                           if (findErr) {
//                             error.push({ refID, error: findErr });
//                             return next(findErr);
//                           }

//                           if (!booking.length) {
//                             error.push({ refID, error: "Booking not found" });
//                             return next(new Error(`Booking ${refID} not found`));
//                             // return next();
//                           }

                          
//                           if (!booking[0].is_short_voucher) {
//                             error.push({
//                               refID,
//                               error: "Record is not marked as short voucher",
//                             });

//                             return next(
//                               new Error(`Booking ${refID} is not marked as short voucher`)
//                             );
//                           }

//                           connectionMain.query(
//                             "UPDATE booking SET voucher_short_ref = ?, bill_number = ? WHERE ref_id = ?",
//                             [short_ref, voucherNumber, refID],
//                             function (updateErr) {
//                               if (updateErr) {
//                                 error.push({ refID, error: updateErr });
//                                 return next(updateErr);
//                               }

//                               next();
//                             }
//                           );
//                         }
//                       );
//                     },
//                     function (err) {
//                       if (err) {
//                         return connectionMain.rollback(function () {
//                           connectionMain.end();

//                           res.json({
//                             success: false,
//                             error: err.message,
//                             errors: error,
//                           });
//                         });
//                       }

//                       connectionMain.commit(function (commitErr) {
//                         if (commitErr) {
//                           return connectionMain.rollback(function () {
//                             connectionMain.end();

//                             res.json({
//                               success: false,
//                               error: commitErr,
//                             });
//                           });
//                         }

//                         connectionMain.end();

//                         res.json({
//                           success: true,
//                           message: "All bookings updated successfully",
//                         });
//                       });
//                     }
//                   );
//                 });
//               });

//               } else {
//                 res.json({ Data: [] });
//               }
//             } else {
//               res.json({ Data: "Error3" });
//             }
//           }
//         },
//       );
//     }
//   });
// });

router.get("/short-voucher-numbers", function (req, res) {
  const connectionMain = mysql.createConnection(corporate);
  const connectionSecond = mysql.createConnection(accountReports);

  const errors = [];
  let updated = 0;

  connectionMain.connect(function (err) {
    if (err) {
      return res.json({ success: false, error: err });
    }

    connectionSecond.connect(function (err) {
      if (err) {
        connectionMain.end();
        return res.json({ success: false, error: err });
      }

      // Get only corporate bookings marked as short vouchers
      connectionMain.query(
        "SELECT ref_id FROM booking WHERE is_short_voucher = 1 AND voucher_short_ref IS NULL AND end_time >= '2026-07-15 00:00:00'",
        function (err, bookings) {
          if (err) {
            connectionMain.end();
            connectionSecond.end();
            return res.json({ success: false, error: err });
          }

          if (!bookings.length) {
            connectionMain.end();
            connectionSecond.end();

            return res.json({
              success: true,
              message: "No short voucher bookings found.",
            });
          } else {
            console.log(`Found ${bookings.length} short voucher bookings to process.`);
          }

          connectionMain.beginTransaction(function (err) {
            if (err) {
              connectionMain.end();
              connectionSecond.end();

              return res.json({
                success: false,
                error: err,
              });
            }

            async.forEachSeries(
              bookings,
              function (booking, next) {
                const refID = booking.ref_id;

                // Find matching booking in account_reports
                connectionSecond.query(
                  `SELECT short_ref, voucherNumber
                   FROM bookings
                   WHERE refID = ?`,
                  [refID],
                  function (err, result) {
                    if (err) {
                      errors.push({ refID, error: err });
                      return next(err);
                    }

                    // Nothing found, error
                    if (!result.length) {
                      errors.push({
                        refID,
                        error: "Booking found in account_reports",
                      });

                      return next(new Error(`Booking ${refID} not  in account_reports`));
                    }

                    const { short_ref, voucherNumber } = result[0];

                    // Update corporate booking
                    connectionMain.query(
                      `UPDATE booking
                       SET voucher_short_ref = ?
                       WHERE ref_id = ?`,
                      [short_ref, refID],
                      function (err) {
                        if (err) {
                          errors.push({ refID, error: err });
                          return next(err);
                        }

                        updated++;
                        next();
                      }
                    );
                  }
                );
              },
              function (err) {
                if (err) {
                  return connectionMain.rollback(function () {
                    connectionMain.end();
                    connectionSecond.end();

                    res.json({
                      success: false,
                      message: "Transaction rolled back.",
                      error: err.message,
                      errors,
                    });
                  });
                }

                connectionMain.commit(function (err) {
                  if (err) {
                    return connectionMain.rollback(function () {
                      connectionMain.end();
                      connectionSecond.end();

                      res.json({
                        success: false,
                        error: err,
                      });
                    });
                  }

                  connectionMain.end();
                  connectionSecond.end();

                  res.json({
                    success: true,
                    message: "Completed successfully.",
                    updated,
                    skipped: errors.length,
                    errors,
                  });
                });
              }
            );
          });
        }
      );
    });
  });
});


export default router;