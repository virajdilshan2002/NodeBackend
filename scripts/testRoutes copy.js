// const express = require("express");
// const mysql = require("mysql");
// const async = require("async");

import express from "express";
import mysql from "mysql";
import async from "async";
import moment from "moment";

const router = express.Router();
let resultData;

const connection1 = {
  host: "192.168.1.11",
  user: "kangaroo",
  password: "kan588",
  database: "1_corporate_prod_copy",
};

// const connection2 = {
//   host: "192.168.1.11",
//   user: "kangaroo",
//   password: "kan588",
//   database: "c_corporate_prod_test",
// };

const connection2 = {
  host: "localhost",
  user: "root",
  password: "Viraj@2002",
  database: "1_corporate_test_copy",
};

// to update org id in booking by code name
// UPDATE booking b
// JOIN organization o ON b.code_organization = o.name
// SET b.organization_id = o.id;

router.get("/org_vehicle_rates_sp", function (req, res, next) {
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  const defaultDiscount = Object.freeze({
    Expo: 0,
    Budget: 0,
    Car: 0,
    City: 0,
    Semi: 0,
    Van: 0,
    "Mini-Van": 0,
    "Buddy-Van": 0,
  });

  connectionSecond.connect(function (err2) {
    if (err2) {
      console.error("DB connection error:", err2);
      connectionSecond.end();
      return res.json({ error: err2 });
    }

    connectionSecond.query(
      "SELECT id, vehicle_rates FROM organization",
      function (err, orgs) {
        if (err) {
          connectionSecond.end();
          return res.json({ error: err });
        }

        console.log("Organization count:", orgs.length);

        async.forEach(
          orgs,
          function (org, nextOrg) {
            let vehicle_rates = [];

            try {
              vehicle_rates = JSON.parse(org.vehicle_rates || "[]");
            } catch (e) {
              console.warn("Invalid JSON org:", org.id);
              error.push({ orgId: org.id, reason: "Invalid JSON" });
              return nextOrg();
            }

            const discount = { ...defaultDiscount };
            const special_discount = { ...defaultDiscount };

            if (Array.isArray(vehicle_rates) && vehicle_rates.length > 0) {
              vehicle_rates.forEach((rate) => {
                if (!rate || !rate.type) return;

                const rawType = rate.type.trim().toLowerCase();

                const typeMap = {
                  expo: "Expo",
                  budget: "Budget",
                  car: "Car",
                  city: "City",
                  semi: "Semi",
                  van: "Van",
                  "mini-van": "Mini-Van",
                  "mini van": "Mini-Van",
                  minivan: "Mini-Van",
                  "buddy-van": "Buddy-Van",
                  "buddy van": "Buddy-Van",
                };

                const key = typeMap[rawType];

                if (!key) {
                  error.push({
                    orgId: org.id,
                    reason: "Unknown type " + rate.type,
                  });
                  return;
                }

                discount[key] = Number(rate.discount) || 0;
                special_discount[key] = Number(rate.special_discount) || 0;
              });
            } else {
              error.push({ orgId: org.id, reason: "Empty vehicle_rates" });
              //   return nextOrg();
            }

            const sql =
              "UPDATE organization SET discount=?, special_discount=? WHERE id=?";

            const values = [
              JSON.stringify(discount),
              JSON.stringify(special_discount),
              org.id,
            ];

            connectionSecond.query(sql, values, function (errUpdate) {
              if (errUpdate) {
                console.error("Update error org:", org.id, errUpdate);
                error.push({ orgId: org.id, reason: errUpdate });
              } else {
                console.log("Updated org:", org.id);
              }

              nextOrg();
            });
          },
          function allDone() {
            connectionSecond.end();
            console.log("Migration finished");

            res.json({
              message: "Vehicle rate update completed",
              errorCount: error.length,
              errors: error,
            });
          },
        );
      },
    );
  });
});

router.get("/org_new_vehicle_rates", function (req, res) {
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionSecond.connect(function (err2) {
    if (err2) {
      console.error("DB connection error:", err2);
      connectionSecond.end();
      return res.json({ error: err2 });
    }

    connectionSecond.query(
      "SELECT id, discount, special_discount, vehicle_rates, approved_categories, sp_rates FROM organization",
      function (err, orgs) {
        if (err) {
          connectionSecond.end();
          return res.json({ error: err });
        }

        let temp = {};

        function safeParse(json) {
          try {
            return json ? JSON.parse(json) : null;
          } catch (e) {
            console.error("Invalid JSON:", json);
            return null;
          }
        }

        const TYPE_MAP = {
          budget: "Budget",
          van: "Van",
          car: "Car",
          city: "City",
          tuk: "Tuk",
          "mini-van": "Mini-Van",
          "buddy-van": "Buddy-Van",
          expo: "Expo",
          semi: "Semi",
        };

        function formatType(type) {
          const key = type?.trim().toLowerCase();
          return TYPE_MAP[key] || type;
        }

        function getValidCategories(source, spRateTypes) {
          if (!source) return [];

          return Object.keys(source)
            .filter((k) => source[k])
            .map((k) => formatType(k))
            .filter((k) => spRateTypes.has(k.toLowerCase()));
        }

        orgs.forEach((org) => {
          const discount = safeParse(org.discount);
          const specialDiscount = safeParse(org.special_discount);
          const vehicleRates = safeParse(org.vehicle_rates);

          const data = {};

          if (vehicleRates) {
            let newTempArray = [];
            let SubTempArray = [];

            const seen = new Set();
            const seenSub = new Set();

            vehicleRates.forEach((rate) => {
              const normalizedType = rate.type?.trim().toLowerCase();
              if (!normalizedType || seen.has(normalizedType)) return;

              seen.add(normalizedType);

              const type = formatType(rate.type);

              newTempArray.push({
                type: type,
                start_date: rate.start_date,
                vat: rate.vat,
                nbt: rate.nbt,
                svat: rate.svat,
                wht: rate.wht,
                credit_limit: rate.credit_limit,
              });

              function pushSub(subType, obj) {
                const key = subType.toLowerCase();
                if (seenSub.has(key)) return;
                seenSub.add(key);

                SubTempArray.push({ type: subType, ...obj });
              }

              if (type === "Budget") {
                pushSub("Budget", {
                  call_up_base_amount_per_km: rate.call_up_base_amount_per_km,
                  call_up_additional_per_km: rate.call_up_additional_per_km,
                  minimum_charge: rate.minimum_charge,
                  minimum_km: rate.minimum_km,
                  per_km_rate: rate.per_km_rate,
                  waiting_rate: rate.waiting_rate,
                  callup: rate.callup,
                });

                pushSub("Expo", {
                  minimum_charge: rate.expo_minimum_charge,
                  minimum_km: rate.expo_minimum_km,
                  per_km_rate: rate.expo_per_km_rate,
                  waiting_rate: rate.expo_waiting_rate,
                  callup: rate.expo_callup,
                });
              } else if (type === "Car") {
                pushSub("Car", {
                  call_up_base_amount_per_km: rate.call_up_base_amount_per_km,
                  call_up_additional_per_km: rate.call_up_additional_per_km,
                  minimum_charge: rate.minimum_charge,
                  minimum_km: rate.minimum_km,
                  per_km_rate: rate.per_km_rate,
                  waiting_rate: rate.waiting_rate,
                  callup: rate.callup,
                });

                pushSub("Semi", {
                  minimum_charge: rate.semi_minimum_charge,
                  minimum_km: rate.semi_minimum_km,
                  per_km_rate: rate.semi_per_km_rate,
                  waiting_rate: rate.semi_waiting_rate,
                  callup: rate.semi_callup,
                });
              } else if (type === "Van") {
                pushSub("Van", {
                  call_up_base_amount_per_km: rate.call_up_base_amount_per_km,
                  call_up_additional_per_km: rate.call_up_additional_per_km,
                  minimum_charge: rate.minimum_charge,
                  minimum_km: rate.minimum_km,
                  per_km_rate: rate.per_km_rate,
                  waiting_rate: rate.waiting_rate,
                  callup: rate.callup,
                });

                pushSub("Mini-Van", {
                  minimum_charge: rate.mini_van_minimum_charge,
                  minimum_km: rate.mini_van_minimum_km,
                  per_km_rate: rate.mini_van_per_km_rate,
                  waiting_rate: rate.mini_van_waiting_rate,
                  callup: rate.mini_van_callup,
                });

                pushSub("Buddy-Van", {
                  minimum_charge: rate.buddy_van_minimum_charge,
                  minimum_km: rate.buddy_van_minimum_km,
                  per_km_rate: rate.buddy_van_per_km_rate,
                  waiting_rate: rate.buddy_van_waiting_rate,
                  callup: rate.buddy_van_callup,
                });
              } else {
                pushSub(type, {
                  call_up_base_amount_per_km: rate.call_up_base_amount_per_km,
                  call_up_additional_per_km: rate.call_up_additional_per_km,
                  minimum_charge: rate.minimum_charge,
                  minimum_km: rate.minimum_km,
                  per_km_rate: rate.per_km_rate,
                  waiting_rate: rate.waiting_rate,
                  callup: rate.callup,
                });
              }
            });

            data.vehicle_rates = newTempArray;
            data.sp_rates = SubTempArray;
          }

          let categories = [];

          if (org.approved_categories && org.approved_categories.trim()) {
            categories = org.approved_categories
              .split(",")
              .map((v) => formatType(v));
          }

          const spRateTypes = new Set(
            (data.sp_rates || []).map((r) => r.type.toLowerCase()),
          );

          categories = categories
            .concat(getValidCategories(discount, spRateTypes))
            .concat(getValidCategories(specialDiscount, spRateTypes));

          categories = [...new Set(categories)];

          if (categories.length) {
            data.approved_categories = categories;
          }

          if (Object.keys(data).length) {
            temp[org.id] = data;
          }
        });

        [temp].forEach((item) => {
          for (const [key, value] of Object.entries(item)) {
            // console.log(`${key}: ${value.approved_categories}`);
            const categories = value.approved_categories.join(",");

            const vehicleRatesStr = JSON.stringify(value.vehicle_rates || []);
            const spRatesStr = JSON.stringify(value.sp_rates || []);

            connectionSecond.query(
              `UPDATE organization 
     SET approved_categories = ?, vehicle_rates = ?, sp_rates = ?
     WHERE id = ?`,
              [categories, vehicleRatesStr, spRatesStr, key],
              (err, result) => {
                if (err) {
                  console.error("Update error:", err);
                } else {
                  console.log("Updated:", key);
                }
              },
            );
          }
        });

        connectionSecond.end();

        return res.json({
          message: "Vehicle rate fetch completed",
          count: Object.keys(temp).length,
          data: temp,
          errorCount: error.length,
          errors: error,
        });
      },
    );
  });
});

router.get("/address", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query("SELECT * FROM address", function (err, result) {
        connectionMain.end();
        if (err) {
          res.json({ Data: "Error2" });
        } else {
          if (result && result.length) {
            let resultData = JSON.stringify(result);
            let json = JSON.parse(resultData);

            if (json && json.length) {
              connectionSecond.connect(function (err2) {
                if (err2) {
                  connectionSecond.end();
                } else {
                  async.forEach(
                    json,
                    function (returnObj, next) {
                      const sql =
                        "INSERT INTO address (address, lat, lan) VALUES (?, ?, ?)";
                      const values = [
                        returnObj.address,
                        returnObj.lat,
                        returnObj.lan,
                      ];

                      connectionSecond.query(
                        sql,
                        values,
                        function (err, result) {
                          if (err) {
                            error.push(values);
                            console.error("Error inserting data:", err);
                            next();
                          } else {
                            // console.log('Data inserted successfully:', result);
                            next();
                          }
                        },
                      );
                    },
                    allDone,
                  );
                  function allDone(notAborted, arr) {
                    connectionSecond.end();
                    res.json({ Error: error });
                  }
                }
              });
            } else {
              res.json({ Data: [] });
            }
          } else {
            res.json({ Data: "Error3" });
          }
        }
      });
    }
  });
});

router.get("/bad_debts", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query("SELECT * FROM bad_debts", function (err, result) {
        connectionMain.end();
        if (err) {
          res.json({ Data: "Error2" });
        } else {
          if (result && result.length) {
            resultData = JSON.stringify(result);
            let json = JSON.parse(resultData);

            if (json && json.length) {
              connectionSecond.connect(function (err2) {
                if (err2) {
                  connectionSecond.end();
                } else {
                  async.forEach(
                    json,
                    function (returnObj, next) {
                      const sql =
                        "INSERT INTO bad_debts (id, customer_code, is_write_off, number, reason, reason_to_undo, vehicular_type, write_off_date, write_off_field, write_off_remove_date, write_off_value, invoice_id, write_off_by, write_off_removed_by, available_certificate_outstanding, available_outstanding) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                      const values = [
                        returnObj.id,
                        returnObj.customer_code,
                        returnObj.is_write_off.data[0],
                        returnObj.number,
                        returnObj.reason,
                        returnObj.reason_to_undo,
                        returnObj.vehicular_type,
                        returnObj.write_off_date,
                        returnObj.write_off_field,
                        returnObj.write_off_remove_date,
                        returnObj.write_off_value,
                        returnObj.invoice_id,
                        returnObj.write_off_by,
                        returnObj.write_off_removed_by,
                        returnObj.available_certificate_outstanding,
                        returnObj.available_outstanding,
                      ];

                      connectionSecond.query(
                        sql,
                        values,
                        function (err, result) {
                          if (err) {
                            error.push(values);
                            console.error("Error inserting data:", err);
                            next();
                          } else {
                            //         // console.log('Data inserted successfully:', result);
                            next();
                          }
                        },
                      );
                    },
                    allDone,
                  );
                  function allDone(notAborted, arr) {
                    connectionSecond.end();
                    res.json({ Error: error });
                  }
                }
              });
            } else {
              res.json({ Data: [] });
            }
          } else {
            res.json({ Data: "Error3" });
          }
        }
      });
    }
  });
});

const safeDate = (d) => {
  if (!d || d === "0000-00-00 00:00:00" || d === "") return null;

  const date = new Date(d);
  return isNaN(date) ? null : date;
};

router.get("/update-booking-org", async (req, res) => {
  const connection = mysql.createConnection(connection2);

  connection.connect(async (err) => {
    if (err) return res.json({ error: err });

    const sql = `
      UPDATE booking b
      JOIN organization o
        ON LOWER(TRIM(o.name)) = LOWER(TRIM(b.code_organization))
      SET b.organization_id = o.id
      WHERE b.organization_id IS NULL
    `;

    connection.query(sql, (err, result) => {
      connection.end();

      if (err) {
        console.error(err);
        return res.json({ error: err });
      }

      res.json({
        message: "Updated successfully",
        affectedRows: result.affectedRows,
      });
    });
  });
});

router.get("/update-booking-org-by-customer-code", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection2);

  let error = [];

    connectionMain.query("SELECT * FROM booking", function (err, result) {
      connectionMain.end();

      if (err) {
        console.log(err);
        return res.json({ Data: "Error2" });
      }

      if (result && result.length) {
        const json = JSON.parse(JSON.stringify(result));

        connectionMain.connect(function (err2) {
          if (err2) {
            connectionMain.end();
            return res.json({ Data: "Connection Error" });
          }

          async.forEach(
            json,
            function (row, next) {
              const sql = `
                  UPDATE booking b
                  JOIN organization o
                    ON LOWER(TRIM(o.name)) = LOWER(TRIM(?))
                  SET b.organization_id = o.id
                  WHERE b.id = ?
                `;

              const values = [row.code_organization, row.id];

              connectionMain.query(sql, values, function (err, result) {
                if (err) {
                  console.error("Error updating row:", err);
                  error.push({ id: row.id, error: err });
                }
                next();
              });
            },
            function allDone() {
              connectionMain.end();
              return res.json({
                Message: "Booking organization_id update completed",
                Error: error,
              });
            },
          );
        });
      } else {
        return res.json({ Data: [] });
      }
    });
  });

router.get("/missing-organizations", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection1);

  let allOrgsInBooking = [];
  let allOrgsInOrganization = [];
  let bookingQueryDone = false;
  let organizationQueryDone = false;

  function finish() {
    if (!bookingQueryDone || !organizationQueryDone) return;

    connectionMain.end();
    connectionSecond.end();

    // Extract organization names
    const bookingOrgNames = allOrgsInBooking.map((o) => o.organization || "");
    const organizationNames = allOrgsInOrganization.map((o) => o.name || "");

    // Find missing organizations
    const missingOrganizationsNames = bookingOrgNames.filter(
      (org) => !organizationNames.includes(org),
    );

    return res.json({
      Message: "Missing organizations report completed",
      MissingOrganizations: missingOrganizationsNames,
      AllOrgsInBooking: bookingOrgNames,
      AllOrgsInOrganization: organizationNames,
    });
  }

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      connectionSecond.end();
      return res.json({ Data: "Error1" });
    }

    // Get all organization names from booking table
    connectionMain.query(
      "SELECT organization FROM booking GROUP BY organization",
      function (err, orgs) {
        if (err) {
          connectionMain.end();
          connectionSecond.end();
          return res.json({ Data: "Error2" });
        }
        allOrgsInBooking = orgs || [];
        bookingQueryDone = true;
        finish();
      },
    );
  });

  connectionSecond.connect(function (err2) {
    if (err2) {
      connectionSecond.end();
      connectionMain.end();
      return res.json({ Data: "Connection Error" });
    }

    // Get all organization names from organization table
    connectionSecond.query(
      "SELECT name FROM organization GROUP BY name",
      function (err, orgs) {
        if (err) {
          connectionSecond.end();
          connectionMain.end();
          return res.json({ Data: "Error3" });
        }
        allOrgsInOrganization = orgs || [];
        organizationQueryDone = true;
        finish();
      },
    );
  });
});

// router.get("/update-booking-org", function (req, res, next) {
//   const connectionMain = mysql.createConnection(connection1);
//   const connectionSecond = mysql.createConnection(connection2);

//   const missingOrganizationsNames = [];
//   let error = [];
//   let finished = false;
//   const batchSize = 10000;

//   function finish() {
//     if (finished) return;
//     finished = true;

//     connectionSecond.end();
//     return res.json({
//       Message: "Booking organization_id update completed",
//       MissingOrganizations: missingOrganizationsNames,
//     });
//   }

//   connectionMain.connect(function (err) {
//     if (err) {
//       connectionMain.end();
//       return res.json({ Data: "Error1" });
//     }

//     connectionSecond.connect(function (err2) {
//       if (err2) {
//         connectionSecond.end();
//         connectionMain.end();
//         return res.json({ Data: "Connection Error" });
//       }

//       function processBatch(lastId) {

//         // Update only bookings that have end_time >= 2026-03-01
//         const bookingSql = `
//           SELECT id, organization, ref_id
//           FROM booking b
//           WHERE id > ?
//           AND b.end_time >= '2026-03-01 00:00:00'
//           ORDER BY id ASC
//           LIMIT ?
//         `;

//         connectionMain.query(
//           bookingSql,
//           [lastId, batchSize],
//           function (err, rows) {
//             if (err) {
//               console.log(err);
//               connectionMain.end();
//               connectionSecond.end();
//               return res.json({ Data: "Error2" });
//             }

//             if (!rows || !rows.length) {
//               connectionMain.end();
//               return finish();
//             }

//             let pending = rows.length;
//             let nextLastId = lastId;

//             rows.forEach(function (row) {
//               nextLastId = row.id;

//               const findOrgSql = `
//               SELECT o.id AS org_id, o.name AS org_name FROM organization o
//               WHERE LOWER(TRIM(o.name)) = LOWER(TRIM(?))
//             `;

//               connectionSecond.query(
//                 findOrgSql,
//                 [row.organization],
//                 function (orgErr, orgResult) {
//                   if (orgErr) {
//                     console.error("Error finding organization:", orgErr);
//                     if (!missingOrganizationsNames.includes(row.organization)) {
//                       missingOrganizationsNames.push(row.organization);
//                     }
//                     pending -= 1;
//                     if (pending === 0) processBatch(nextLastId);
//                     return;
//                   }

//                   if (!orgResult || !orgResult.length) {
//                     console.error(
//                       "Organization not found for ref id:",
//                       row.ref_id,
//                     );
//                     if (!missingOrganizationsNames.includes(row.organization)) {
//                       missingOrganizationsNames.push(row.organization);
//                     }
//                     error.push({
//                       id: row.id,
//                       error: "Organization not found",
//                     });
//                     pending -= 1;
//                     if (pending === 0) processBatch(nextLastId);
//                     return;
//                   }

//                   const org_id = orgResult[0].org_id;
//                   const org_name = orgResult[0].org_name;
//                   console.log(
//                     `Updating booking ${row.id} with organization_id ${org_id}`,
//                   );

//                   const sql = `
//                   UPDATE booking b
//                   SET b.organization_id = ?
//                   , b.code_organization = ?
//                   WHERE b.id = ?
//                 `;

//                   connectionSecond.query(
//                     sql,
//                     [org_id, org_name, row.id],
//                     function (updateErr) {
//                       if (updateErr) {
//                         console.error("Error updating row:", updateErr);
//                         error.push({ id: row.id, error: updateErr });
//                       }

//                       pending -= 1;
//                       if (pending === 0) processBatch(nextLastId);
//                     },
//                   );
//                 },
//               );
//             });
//           },
//         );
//       }

//       processBatch(0);
//     });
//   });
// });

router.get("/booking", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query("SELECT * FROM booking", function (err, result) {
        connectionMain.end();
        if (err) {
          res.json({ Data: "Error2" });
        } else {
          if (result && result.length) {
            resultData = JSON.stringify(result);
            let json = JSON.parse(resultData);

            if (json && json.length) {
              connectionSecond.connect(function (err2) {
                if (err2) {
                  connectionSecond.end();
                } else {
                  async.forEach(
                    json,
                    function (returnObj, next) {
                      const sql = `
  INSERT INTO booking (
    id ,distance, ref_id, total_fare, waitingtime, contact_number, country_code, 
    custom_package_base_km, custom_package_base_rate, customer_email, customer_first_name, 
    customer_last_name, drop_off_address, flight_number, initial_drop_off_lat, initial_drop_off_lng, 
    is_guest_carrier, landmarks, packageid, package_type, paging_board, payment_method, 
    pick_up_address, pick_up_lat, pick_up_lng, requested_time, vehicular_type, auth_token, 
    base_fare, base_km, cab_no, call_up_charge, discount, dispatched_time, distance_fare, 
    driver_accept_time, driver_arrive_time, driver_id, end_time, external_customerid, 
    required_cab_no, start_time, type, waiting_fare, waiting_time, status, corporate_payment_token, 
    unedited_distance, unedited_distance_fare, unedited_total_fare, unedited_waiting_fare, 
    unedited_waiting_time, is_checked, invoice_no, uneditedcall_up_charge, cashier_amount, 
    flat_rate, highway, unedited_call_up_charge, unmarked_fare, discount_fare_per_km, 
    unedited_highway, unedited_unmarked_fare, is_allow_discount, corporate_remarks, edited_remarks, 
    package_name, detailed_pick_up_address, approved_time, created_time, is_admin_approved, 
    rq_cab_no, is_manually_edit, custom_package_base_time, custom_package_per_km_rate, 
    extra_charge, is_skip_calculation, voucher_number, discount_type, cop_detailed_pick_up_address, 
    cop_pick_up_address, cop_pick_up_lat, cop_pick_up_lng, cop_call_up_charge, highway_rec, 
    perkm, waiting_per_min, highway_remark, call_center_remark, transact_vehicular_type, 
    second_contact_number, highway_flag, department_id, code_organization, organization_id, 
    customer_id, created_by_user, cancel_by_user, remarks, remark, voucher_in, v_char
  ) VALUES (${Array(102).fill("?").join(", ")});
`;

                      returnObj.is_guest_carrier =
                        returnObj.is_guest_carrier == 0
                          ? false
                          : returnObj.is_guest_carrier == 1
                            ? true
                            : null;

                      const values = [
                        returnObj.id,
                        returnObj.distance,
                        returnObj.ref_id,
                        returnObj.total_fare,
                        safeDate(returnObj.waitingtime),
                        returnObj.contact_number,
                        returnObj.country_code == "undefined"
                          ? null
                          : returnObj.country_code,
                        returnObj.custom_package_base_km,
                        returnObj.custom_package_base_rate,
                        returnObj.customer_email,
                        returnObj.customer_first_name,
                        returnObj.customer_last_name,
                        returnObj.drop_off_address,
                        returnObj.flight_number,
                        returnObj.initial_drop_off_lat,
                        returnObj.initial_drop_off_lng,
                        returnObj.is_guest_carrier,
                        returnObj.landmarks == "undefined"
                          ? null
                          : returnObj.landmarks == "null"
                            ? null
                            : returnObj.landmarks,
                        returnObj.packageid,
                        returnObj.package_type,
                        returnObj.paging_board,
                        returnObj.payment_method,
                        returnObj.pick_up_address,
                        returnObj.pick_up_lat,
                        returnObj.pick_up_lng,
                        safeDate(returnObj.requested_time),
                        returnObj.vehicular_type,
                        returnObj.auth_token,
                        returnObj.base_fare,
                        returnObj.base_km,
                        returnObj.cab_no,
                        returnObj.call_up_charge,
                        returnObj.discount,
                        safeDate(returnObj.dispatched_time),
                        returnObj.distance_fare,
                        safeDate(returnObj.driver_accept_time),
                        safeDate(returnObj.driver_arrive_time),
                        returnObj.driver_id,
                        safeDate(returnObj.end_time),
                        returnObj.external_customerid,
                        returnObj.required_cab_no,
                        safeDate(returnObj.start_time),
                        returnObj.type,
                        returnObj.waiting_fare,
                        returnObj.waiting_time,
                        returnObj.status,
                        returnObj.corporate_payment_token,
                        returnObj.unedited_distance,
                        returnObj.unedited_distance_fare,
                        returnObj.unedited_total_fare,
                        returnObj.unedited_waiting_fare,
                        returnObj.unedited_waiting_time,
                        returnObj.is_checked?.data?.[0] ?? null,
                        returnObj.invoice_no,
                        returnObj.uneditedcall_up_charge,
                        returnObj.cashier_amount,
                        returnObj.flat_rate,
                        returnObj.highway,
                        returnObj.unedited_call_up_charge,
                        returnObj.unmarked_fare,
                        returnObj.discount_fare_per_km,
                        returnObj.unedited_highway,
                        returnObj.unedited_unmarked_fare,
                        returnObj.is_allow_discount?.data?.[0] ?? null,
                        returnObj.corporate_remarks,
                        returnObj.edited_remarks,
                        returnObj.package_name,
                        returnObj.detailed_pick_up_address,
                        safeDate(returnObj.approved_time),
                        safeDate(returnObj.created_time),
                        returnObj.is_admin_approved?.data?.[0] ?? null,
                        returnObj.rq_cab_no,
                        returnObj.is_manually_edit?.data?.[0] ?? null,
                        safeDate(returnObj.custom_package_base_time),
                        returnObj.custom_package_per_km_rate,
                        returnObj.extra_charge,
                        returnObj.is_skip_calculation?.data?.[0] ?? null,
                        returnObj.voucher_number,
                        returnObj.discount_type,
                        returnObj.cop_detailed_pick_up_address,
                        returnObj.cop_pick_up_address,
                        returnObj.cop_pick_up_lat,
                        returnObj.cop_pick_up_lng,
                        returnObj.cop_call_up_charge,
                        returnObj.highway_rec,
                        returnObj.perkm,
                        returnObj.waiting_per_min,
                        returnObj.highway_remark,
                        returnObj.call_center_remark,
                        returnObj.transact_vehicular_type,
                        returnObj.second_contact_number,
                        returnObj.highway_flag?.data?.[0] ?? null,
                        returnObj.department_id,
                        returnObj.organization,
                        null,
                        returnObj.customer_id,
                        returnObj.created_by_user == ""
                          ? null
                          : returnObj.created_by_user,
                        null,
                        returnObj.remarks,
                        returnObj.remark,
                        returnObj.voucher_in,
                        returnObj.v_char,
                      ];

                      connectionSecond.query(
                        sql,
                        values,
                        function (err, result) {
                          if (err) {
                            error.push(values);
                            console.error("Error inserting data:", err);
                            next();
                          } else {
                            next();
                          }
                        },
                      );
                    },
                    allDone,
                  );
                  function allDone(notAborted, arr) {
                    connectionSecond.end();
                    res.json({ Error: error });
                  }
                }
              });
            } else {
              res.json({ Data: [] });
            }
          } else {
            res.json({ Data: "Error3" });
          }
        }
      });
    }
  });
});

router.get("/booking-edit", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT * FROM bookings_edit_history",
        function (err, result) {
          connectionMain.end();
          if (err) {
            res.json({ Data: "Error2" });
          } else {
            if (result && result.length) {
              resultData = JSON.stringify(result);
              let json = JSON.parse(resultData);

              if (json && json.length) {
                connectionSecond.connect(function (err2) {
                  if (err2) {
                    connectionSecond.end();
                  } else {
                    async.forEach(
                      json,
                      function (returnObj, next) {
                        const sql = `
  INSERT INTO bookings_edit_history (
    id ,previous_value, ref_id, time_of_update, updated_field, updated_value, corporate_remarks, edit_by 
  ) VALUES (${Array(8).fill("?").join(", ")});
`;

                        const values = [
                          returnObj.id,
                          returnObj.previous_value,
                          returnObj.ref_id,
                          returnObj.time_of_update,
                          returnObj.updated_field,
                          returnObj.updated_value,
                          returnObj.corporate_remarks,
                          returnObj.edit_by,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              error.push(values);
                              console.error("Error inserting data:", err);
                              next();
                            } else {
                              next();
                            }
                          },
                        );
                      },
                      allDone,
                    );
                    function allDone(notAborted, arr) {
                      connectionSecond.end();
                      res.json({ Error: error });
                    }
                  }
                });
              } else {
                res.json({ Data: [] });
              }
            } else {
              res.json({ Data: "Error3" });
            }
          }
        },
      );
    }
  });
});

router.get("/commissions", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query("SELECT * FROM commissions", function (err, result) {
        connectionMain.end();
        if (err) {
          res.json({ Data: "Error2" });
        } else {
          if (result && result.length) {
            resultData = JSON.stringify(result);
            let json = JSON.parse(resultData);

            if (json && json.length) {
              connectionSecond.connect(function (err2) {
                if (err2) {
                  connectionSecond.end();
                } else {
                  async.forEach(
                    json,
                    function (returnObj, next) {
                      const sql = `
  INSERT INTO commissions (
    id ,commission, days, rate, type, rates, payment, date, receipt_invoice_id   
  ) VALUES (${Array(9).fill("?").join(", ")});
`;

                      const values = [
                        returnObj.id,
                        returnObj.commission,
                        returnObj.days,
                        returnObj.rate,
                        returnObj.type,
                        returnObj.rates,
                        returnObj.payment,
                        returnObj.date,
                        returnObj.receipt_invoice_id,
                      ];

                      connectionSecond.query(
                        sql,
                        values,
                        function (err, result) {
                          if (err) {
                            error.push(values);
                            console.error("Error inserting data:", err);
                            next();
                          } else {
                            next();
                          }
                        },
                      );
                    },
                    allDone,
                  );
                  function allDone(notAborted, arr) {
                    connectionSecond.end();
                    res.json({ Error: error });
                  }
                }
              });
            } else {
              res.json({ Data: [] });
            }
          } else {
            res.json({ Data: "Error3" });
          }
        }
      });
    }
  });
});

router.get("/contact_personnel", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT * FROM contact_personnel",
        function (err, result) {
          connectionMain.end();
          if (err) {
            res.json({ Data: "Error2" });
          } else {
            if (result && result.length) {
              resultData = JSON.stringify(result);
              let json = JSON.parse(resultData);

              if (json && json.length) {
                connectionSecond.connect(function (err2) {
                  if (err2) {
                    connectionSecond.end();
                  } else {
                    async.forEach(
                      json,
                      function (returnObj, next) {
                        const sql = `
  INSERT INTO contact_personnel (
    id ,email, first_name, land_number, last_name, mobile_number, organization_id    
  ) VALUES (${Array(7).fill("?").join(", ")});
`;

                        const values = [
                          returnObj.id,
                          returnObj.email,
                          returnObj.first_name,
                          returnObj.land_number,
                          returnObj.last_name,
                          returnObj.mobile_number,
                          returnObj.organization_id,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              error.push(values);
                              console.error("Error inserting data:", err);
                              next();
                            } else {
                              next();
                            }
                          },
                        );
                      },
                      allDone,
                    );
                    function allDone(notAborted, arr) {
                      connectionSecond.end();
                      res.json({ Error: error });
                    }
                  }
                });
              } else {
                res.json({ Data: [] });
              }
            } else {
              res.json({ Data: "Error3" });
            }
          }
        },
      );
    }
  });
});

router.get("/customer", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query("SELECT * FROM customer", function (err, result) {
        connectionMain.end();
        if (err) {
          res.json({ Data: "Error2" });
        } else {
          if (result && result.length) {
            resultData = JSON.stringify(result);
            let json = JSON.parse(resultData);

            if (json && json.length) {
              connectionSecond.connect(function (err2) {
                if (err2) {
                  connectionSecond.end();
                } else {
                  async.forEach(
                    json,
                    function (returnObj, next) {
                      const sql = `
  INSERT INTO customer (
    id ,contact_number, country_code, email, first_name, last_name, salutation, is_created, random_password, password
  ) VALUES (${Array(10).fill("?").join(", ")});
`;

                      const values = [
                        returnObj.id,
                        returnObj.contact_number,
                        returnObj.country_code,
                        returnObj.email,
                        returnObj.first_name,
                        returnObj.last_name,
                        returnObj.salutation,
                        returnObj.is_created.data[0],
                        returnObj.random_password,
                        returnObj.password,
                      ];

                      connectionSecond.query(
                        sql,
                        values,
                        function (err, result) {
                          if (err) {
                            error.push(values);
                            console.error("Error inserting data:", err);
                            next();
                          } else {
                            next();
                          }
                        },
                      );
                    },
                    allDone,
                  );
                  function allDone(notAborted, arr) {
                    connectionSecond.end();
                    res.json({ Error: error });
                  }
                }
              });
            } else {
              res.json({ Data: [] });
            }
          } else {
            res.json({ Data: "Error3" });
          }
        }
      });
    }
  });
});

router.get("/customer_department", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT * FROM customer_department",
        function (err, result) {
          connectionMain.end();
          if (err) {
            res.json({ Data: "Error2" });
          } else {
            if (result && result.length) {
              resultData = JSON.stringify(result);
              let json = JSON.parse(resultData);

              if (json && json.length) {
                connectionSecond.connect(function (err2) {
                  if (err2) {
                    connectionSecond.end();
                  } else {
                    async.forEach(
                      json,
                      function (returnObj, next) {
                        const sql = `
  INSERT INTO customer_department (
    id ,added_date, credit_limit, running_balance, payment_token, is_disabled, employee_id, is_approval_required_for_booking, is_calling_portal_allowed, customer_id, department_id, added_by ) VALUES (${Array(12).fill("?").join(", ")});
`;

                        const values = [
                          returnObj.id,
                          returnObj.added_date,
                          returnObj.credit_limit,
                          returnObj.running_balance,
                          returnObj.payment_token,
                          returnObj?.is_disabled?.data[0] ?? null,
                          returnObj.employee_id,
                          returnObj.is_approval_required_for_booking?.data[0] ??
                            null,
                          returnObj?.is_calling_portal_allowed?.data[0] ?? null,
                          returnObj.customer_id,
                          returnObj.department_id,
                          returnObj.added_by,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              error.push(values);
                              console.error("Error inserting data:", err);
                              next();
                            } else {
                              next();
                            }
                          },
                        );
                      },
                      allDone,
                    );
                    function allDone(notAborted, arr) {
                      connectionSecond.end();
                      res.json({ Error: error });
                    }
                  }
                });
              } else {
                res.json({ Data: [] });
              }
            } else {
              res.json({ Data: "Error3" });
            }
          }
        },
      );
    }
  });
});

router.get("/customer_join_request", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT * FROM customer_join_request",
        function (err, result) {
          connectionMain.end();
          if (err) {
            res.json({ Data: "Error2" });
          } else {
            if (result && result.length) {
              resultData = JSON.stringify(result);
              let json = JSON.parse(resultData);

              if (json && json.length) {
                connectionSecond.connect(function (err2) {
                  if (err2) {
                    connectionSecond.end();
                  } else {
                    async.forEach(
                      json,
                      function (returnObj, next) {
                        const sql = `
  INSERT INTO customer_join_request (
    id ,requested_date, added_date, is_approved, rejected_date, is_rejected, credit_limit, customer_id, department_id, approved_by, rejected_by ) VALUES (${Array(11).fill("?").join(", ")});
`;

                        returnObj.requested_date =
                          returnObj.requested_date === undefined
                            ? null
                            : returnObj.requested_date === ""
                              ? null
                              : returnObj.requested_date;

                        returnObj.added_date =
                          returnObj.added_date === undefined
                            ? null
                            : returnObj.added_date === ""
                              ? null
                              : returnObj.added_date;

                        returnObj.rejected_date =
                          returnObj.rejected_date === undefined
                            ? null
                            : returnObj.rejected_date === ""
                              ? null
                              : returnObj.rejected_date;

                        const values = [
                          returnObj.id,
                          returnObj.requested_date ?? null,
                          returnObj.added_date ?? null,
                          returnObj?.is_approved?.data[0] ?? null,
                          returnObj.rejected_date ?? null,
                          returnObj?.is_rejected?.data[0] ?? null,
                          returnObj.credit_limit,
                          returnObj.customer_id,
                          returnObj?.department_id,
                          returnObj.approved_by,
                          returnObj.rejected_by,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              error.push(values);
                              console.error("Error inserting data:", err);
                              next();
                            } else {
                              next();
                            }
                          },
                        );
                      },
                      allDone,
                    );
                    function allDone(notAborted, arr) {
                      connectionSecond.end();
                      res.json({ Error: error });
                    }
                  }
                });
              } else {
                res.json({ Data: [] });
              }
            } else {
              res.json({ Data: "Error3" });
            }
          }
        },
      );
    }
  });
});

router.get("/custom_packages", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT * FROM custom_packages",
        function (err, result) {
          connectionMain.end();
          if (err) {
            res.json({ Data: "Error2" });
          } else {
            if (result && result.length) {
              resultData = JSON.stringify(result);
              let json = JSON.parse(resultData);

              if (json && json.length) {
                connectionSecond.connect(function (err2) {
                  if (err2) {
                    connectionSecond.end();
                  } else {
                    async.forEach(
                      json,
                      function (returnObj, next) {
                        const sql = `
  INSERT INTO custom_packages (
    id, area, base_km, base_rate, base_time, bothway_rate, created_at,
    drop_rate, guest_carrier_rate, name, per_km_rate,
    pick_up_rate, status, time_unit_type, type,
    updated_at, vehicular_type, waiting_rate, organization_id
  ) VALUES (${Array(19).fill("?").join(", ")});
`;
                        const values = [
                          returnObj.id,
                          returnObj.area,
                          returnObj.base_km,
                          returnObj.base_rate,
                          returnObj.base_time,
                          returnObj.bothway_rate,
                          returnObj.created_at,
                          returnObj.drop_rate,
                          returnObj.guest_carrier_rate,
                          returnObj.name,
                          returnObj.per_km_rate,
                          returnObj.pick_up_rate,
                          returnObj.status,
                          returnObj.time_unit_type,
                          returnObj.type,
                          returnObj.updated_at,
                          returnObj.vehicular_type,
                          returnObj.waiting_rate,
                          returnObj.organization_id,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              error.push(values);
                              console.error("Error inserting data:", err);
                              next();
                            } else {
                              next();
                            }
                          },
                        );
                      },
                      allDone,
                    );
                    function allDone(notAborted, arr) {
                      connectionSecond.end();
                      res.json({ Error: error });
                    }
                  }
                });
              } else {
                res.json({ Data: [] });
              }
            } else {
              res.json({ Data: "Error3" });
            }
          }
        },
      );
    }
  });
});

router.get("/debt_collectors", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT * FROM debt_collectors",
        function (err, result) {
          connectionMain.end();
          if (err) {
            res.json({ Data: "Error2" });
          } else {
            if (result && result.length) {
              resultData = JSON.stringify(result);
              let json = JSON.parse(resultData);

              if (json && json.length) {
                connectionSecond.connect(function (err2) {
                  if (err2) {
                    connectionSecond.end();
                  } else {
                    async.forEach(
                      json,
                      function (returnObj, next) {
                        const sql = `
  INSERT INTO debt_collectors (
    id, account_end_date, account_start_date, email, first_name, last_name, mobile_number,
    username, commission_rate, delayed_commission_rate
  ) VALUES (${Array(10).fill("?").join(", ")});
`;
                        const values = [
                          returnObj.id,
                          returnObj.account_end_date,
                          returnObj.account_start_date,
                          returnObj.email,
                          returnObj.first_name,
                          returnObj.last_name,
                          returnObj.mobile_number,
                          returnObj.username,
                          returnObj.commission_rate,
                          returnObj.delayed_commission_rate,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              error.push(values);
                              console.error("Error inserting data:", err);
                              next();
                            } else {
                              next();
                            }
                          },
                        );
                      },
                      allDone,
                    );
                    function allDone(notAborted, arr) {
                      connectionSecond.end();
                      res.json({ Error: error });
                    }
                  }
                });
              } else {
                res.json({ Data: [] });
              }
            } else {
              res.json({ Data: "Error3" });
            }
          }
        },
      );
    }
  });
});

router.get("/department", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query("SELECT * FROM department", function (err, result) {
        connectionMain.end();
        if (err) {
          res.json({ Data: "Error2" });
        } else {
          if (result && result.length) {
            resultData = JSON.stringify(result);
            let json = JSON.parse(resultData);

            if (json && json.length) {
              connectionSecond.connect(function (err2) {
                if (err2) {
                  connectionSecond.end();
                } else {
                  async.forEach(
                    json,
                    function (returnObj, next) {
                      const sql = `
  INSERT INTO department (
    id, approved_categories, credit_limit, join_request_token, name, payment_token, is_deleted,
    running_balance, is_approval_required_for_booking, email, organization_id, contact_personnels_id 
  ) VALUES (${Array(12).fill("?").join(", ")});
`;
                      const values = [
                        returnObj.id,
                        returnObj.approved_categories,
                        returnObj.credit_limit,
                        returnObj.join_request_token,
                        returnObj.name,
                        returnObj.payment_token,
                        returnObj?.is_deleted?.data[0] ?? null,
                        returnObj.running_balance,
                        returnObj?.is_approval_required_for_booking?.data[0] ??
                          null,
                        returnObj.email,
                        returnObj.organization_id,
                        returnObj.contact_personnels_id,
                      ];

                      connectionSecond.query(
                        sql,
                        values,
                        function (err, result) {
                          if (err) {
                            error.push(values);
                            console.error("Error inserting data:", err);
                            next();
                          } else {
                            next();
                          }
                        },
                      );
                    },
                    allDone,
                  );
                  function allDone(notAborted, arr) {
                    connectionSecond.end();
                    res.json({ Error: error });
                  }
                }
              });
            } else {
              res.json({ Data: [] });
            }
          } else {
            res.json({ Data: "Error3" });
          }
        }
      });
    }
  });
});

router.get("/invoices", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];
  // const moment = require("moment");

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query("SELECT i.*, o.id AS org_id, o.name AS org_name, o.display_name AS org_display_name FROM invoices i LEFT JOIN organization o ON i.customer_code = o.customer_code", function (err, result) {
        connectionMain.end();
        if (err) {
          res.json({ Data: "Error2" });
        } else {
          if (result && result.length) {
            resultData = JSON.stringify(result);
            let json = JSON.parse(resultData);

            if (json && json.length) {
              connectionSecond.connect(function (err2) {
                if (err2) {
                  connectionSecond.end();
                } else {
                  async.forEach(
                    json,
                    function (returnObj, next) {
                      
                      const sql = `
  INSERT INTO invoices (
    id, number, total, discount, discount_percentage, gross_amount, nbt, net_amount,
    non_discount_amount, special_discount, special_discount_percentage, sub_total,
    total_with_nbt, vat, aggrement_categories, customer_code, end_date, invoiced_categories,
    is_cancelled, start_date, type, outstanding, paid, svat, wht, total_discount,
    total_non_discount_amount, total_special_discount, is_non_agreement_categories_allowed,
    organization, wht_added_by, balance_as_at_end_date, balance_as_at_start_date,
    deductions, payments, invoicing_method, created_date, pre_check_warned_bookings,
    unedited_balance_as_at_end_date, unedited_balance_as_at_start_date,
    unedited_outstanding, unedited_payments, is_email_sent, certificate_outstanding,
    certificate_paid, pay, email_addresses, sent_time, header_vehicular_type, nbt_rate,
    vat_rate, is_amended, is_hold, cancelled_date, external_schedule_refer, cancelled_by,
    created_by, organization_id, department_id
  ) VALUES (${Array(59).fill("?").join(", ")}); `;

                      const values = [
                        returnObj.id,
                        returnObj.number,
                        returnObj.total,
                        returnObj.discount,
                        returnObj.discount_percentage,
                        returnObj.gross_amount,
                        returnObj.nbt,
                        returnObj.net_amount,
                        returnObj.non_discount_amount,
                        returnObj.special_discount,
                        returnObj.special_discount_percentage,
                        returnObj.sub_total,
                        returnObj.total_with_nbt,
                        returnObj.vat,
                        returnObj.aggrement_categories,
                        returnObj.customer_code,
                        returnObj.end_date,
                        returnObj.invoiced_categories,
                        returnObj?.is_cancelled?.data[0] ?? null,
                        returnObj.start_date,
                        returnObj.type,
                        returnObj.outstanding,
                        returnObj.paid,
                        returnObj.svat,
                        returnObj.wht,
                        returnObj.total_discount,
                        returnObj.total_non_discount_amount,
                        returnObj.total_special_discount,
                        returnObj.is_non_agreement_categories_allowed
                          ?.data[0] ?? null,
                        returnObj.organization,
                        returnObj.wht_added_by,
                        returnObj.balance_as_at_end_date,
                        returnObj.balance_as_at_start_date,
                        returnObj.deductions,
                        returnObj.payments,
                        returnObj.invoicing_method,
                        // moment(
                        //   returnObj.created_date,
                        //   "YYYY-MM-DD hh:mm:ss A",
                        // ).format("YYYY-MM-DD HH:mm:ss"),
                        safeDate(returnObj.created_date),
                        returnObj.pre_check_warned_bookings,
                        returnObj.unedited_balance_as_at_end_date,
                        returnObj.unedited_balance_as_at_start_date,
                        returnObj.unedited_outstanding,
                        returnObj.unedited_payments,
                        returnObj.is_email_sent,
                        returnObj.certificate_outstanding,
                        returnObj.certificate_paid,
                        returnObj.pay,
                        returnObj.email_addresses,
                        returnObj.sent_time
                          ? moment(
                              returnObj.sent_time,
                              "YYYY-MM-DD hh:mm:ss A",
                            ).format("YYYY-MM-DD HH:mm:ss")
                          : null,
                        returnObj.header_vehicular_type,
                        returnObj.nbt_rate,
                        returnObj.vat_rate,
                        returnObj?.is_amended?.data[0] ?? null,
                        returnObj?.is_hold?.data[0] ?? null,
                        returnObj.cancelled_date,
                        returnObj.external_schedule_refer,
                        returnObj.cancelled_by,
                        returnObj.created_by,
                        returnObj.org_id
                          ? returnObj.org_id
                          : null,
                        returnObj.department_id,
                      ];

                      connectionSecond.query(
                        sql,
                        values,
                        function (err, result) {
                          if (err) {
                            error.push(values);
                            console.error("Error inserting data:", err);
                            next();
                          } else {
                            console.log("Inserted org to invoice no: ", returnObj.number);
                            
                            next();
                          }
                        },
                      );
                    },
                    allDone,
                  );
                  function allDone(notAborted, arr) {
                    connectionSecond.end();
                    res.json({ Error: error });
                  }
                }
              });
            } else {
              res.json({ Data: [] });
            }
          } else {
            res.json({ Data: "Error3" });
          }
        }
      });
    }
  });
});

router.get("/invoices-organization", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection2);
  let error = [];
  // const moment = require("moment");

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query("UPDATE invoices i LEFT JOIN organization o ON i.customer_code = o.customer_code SET i.organization_id = o.id", function (err, result) {
        if (err) {
          res.json({ Data: err });
          connectionMain.end();
        } else {
          res.json({ Data: "Completed" });
          connectionMain.end();
        }
      });
    }
  });
});

router.get("/invoice_amend_history", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT iah.*, inv.id as inv_id FROM invoice_amend_history iah LEFT JOIN invoices inv ON iah.invoice_number = inv.number",
        function (err, result) {
          connectionMain.end();
          if (err) {
            res.json({ Data: "Error2" });
          } else {
            if (result && result.length) {
              resultData = JSON.stringify(result);
              let json = JSON.parse(resultData);

              if (json && json.length) {
                connectionSecond.connect(function (err2) {
                  if (err2) {
                    connectionSecond.end();
                  } else {
                    async.forEach(
                      json,
                      function (returnObj, next) {
                        const sql = `
  INSERT INTO invoice_amend_history (
    id, amend_time, reason, invoice_number, amend_by, invoice_id
    ) VALUES (${Array(6).fill("?").join(", ")}); `;

                        const values = [
                          returnObj.id,
                          returnObj.amend_time,
                          returnObj.reason,
                          returnObj.invoice_number,
                          returnObj.amend_by,
                          returnObj.inv_id ? returnObj.inv_id : null,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              error.push(values);
                              console.error("Error inserting data:", err);
                              next();
                            } else {
                              next();
                            }
                          },
                        );
                      },
                      allDone,
                    );
                    function allDone(notAborted, arr) {
                      connectionSecond.end();
                      res.json({ Error: error });
                    }
                  }
                });
              } else {
                res.json({ Data: [] });
              }
            } else {
              res.json({ Data: "Error3" });
            }
          }
        },
      );
    }
  });
});

router.get("/invoice_discounts", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT * FROM invoice_discounts",
        function (err, result) {
          connectionMain.end();
          if (err) {
            res.json({ Data: "Error2" });
          } else {
            if (result && result.length) {
              resultData = JSON.stringify(result);
              let json = JSON.parse(resultData);

              if (json && json.length) {
                connectionSecond.connect(function (err2) {
                  if (err2) {
                    connectionSecond.end();
                  } else {
                    async.forEach(
                      json,
                      function (returnObj, next) {
                        const sql = `
  INSERT INTO invoice_discounts (
    id, discount, discount_percentage, gross_amount, non_discount_amount, special_discount, special_discount_percentage, vehicular_type, invoice_id 
    ) VALUES (${Array(9).fill("?").join(", ")}); `;

                        const values = [
                          returnObj.id,
                          returnObj.discount,
                          returnObj.discount_percentage,
                          returnObj.gross_amount,
                          returnObj.non_discount_amount,
                          returnObj.special_discount,
                          returnObj.special_discount_percentage,
                          returnObj.vehicular_type,
                          returnObj.invoice_id,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              error.push(values);
                              console.error("Error inserting data:", err);
                              next();
                            } else {
                              next();
                            }
                          },
                        );
                      },
                      allDone,
                    );
                    function allDone(notAborted, arr) {
                      connectionSecond.end();
                      res.json({ Error: error });
                    }
                  }
                });
              } else {
                res.json({ Data: [] });
              }
            } else {
              res.json({ Data: "Error3" });
            }
          }
        },
      );
    }
  });
});

router.get("/invoice_email_history", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT * FROM invoice_email_history",
        function (err, result) {
          connectionMain.end();
          if (err) {
            res.json({ Data: "Error2" });
          } else {
            if (result && result.length) {
              resultData = JSON.stringify(result);
              let json = JSON.parse(resultData);

              if (json && json.length) {
                connectionSecond.connect(function (err2) {
                  if (err2) {
                    connectionSecond.end();
                  } else {
                    async.forEach(
                      json,
                      function (returnObj, next) {
                        const sql = `
  INSERT INTO invoice_email_history (
    id, is_sent, sent_time, invoice_number, addresses, customer_code, sent_by
    ) VALUES (${Array(7).fill("?").join(", ")}); `;

                        const values = [
                          returnObj.id,
                          returnObj?.is_sent?.data[0] ?? null,
                          returnObj.sent_time,
                          returnObj.invoice_number,
                          returnObj.addresses,
                          returnObj.customer_code,
                          returnObj.sent_by,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              error.push(values);
                              console.error("Error inserting data:", err);
                              next();
                            } else {
                              next();
                            }
                          },
                        );
                      },
                      allDone,
                    );
                    function allDone(notAborted, arr) {
                      connectionSecond.end();
                      res.json({ Error: error });
                    }
                  }
                });
              } else {
                res.json({ Data: [] });
              }
            } else {
              res.json({ Data: "Error3" });
            }
          }
        },
      );
    }
  });
});

router.get("/kangaroo_banks", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT * FROM kangaroo_banks",
        function (err, result) {
          connectionMain.end();
          if (err) {
            res.json({ Data: "Error2" });
          } else {
            if (result && result.length) {
              let resultData = JSON.stringify(result);
              let json = JSON.parse(resultData);

              if (json && json.length) {
                connectionSecond.connect(function (err2) {
                  if (err2) {
                    connectionSecond.end();
                  } else {
                    async.forEach(
                      json,
                      function (returnObj, next) {
                        const sql = `
  INSERT INTO kangaroo_banks (
    id, account_number, company_type, name
    ) VALUES (${Array(4).fill("?").join(", ")}); `;

                        const values = [
                          returnObj.id,
                          returnObj.account_number,
                          returnObj.company_type,
                          returnObj.name,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              error.push(values);
                              console.error("Error inserting data:", err);
                              next();
                            } else {
                              next();
                            }
                          },
                        );
                      },
                      allDone,
                    );
                    function allDone(notAborted, arr) {
                      connectionSecond.end();
                      res.json({ Error: error });
                    }
                  }
                });
              } else {
                res.json({ Data: [] });
              }
            } else {
              res.json({ Data: "Error3" });
            }
          }
        },
      );
    }
  });
});

router.get("/marketing_personnel", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT * FROM marketing_personnel",
        function (err, result) {
          connectionMain.end();
          if (err) {
            res.json({ Data: "Error2" });
          } else {
            if (result && result.length) {
              let resultData = JSON.stringify(result);
              let json = JSON.parse(resultData);

              if (json && json.length) {
                connectionSecond.connect(function (err2) {
                  if (err2) {
                    connectionSecond.end();
                  } else {
                    async.forEach(
                      json,
                      function (returnObj, next) {
                        const sql = `
  INSERT INTO marketing_personnel (
    id, account_endt_date, account_start_date, email, first_name, last_name, mobile_number, username, rep_code, password, random_password
    ) VALUES (${Array(11).fill("?").join(", ")}); `;

                        const values = [
                          returnObj.id,
                          returnObj.account_endt_date,
                          returnObj.account_start_date,
                          returnObj.email,
                          returnObj.first_name,
                          returnObj.last_name,
                          returnObj.mobile_number,
                          returnObj.username,
                          returnObj.rep_code,
                          returnObj.password,
                          returnObj.random_password,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              error.push(values);
                              console.error("Error inserting data:", err);
                              next();
                            } else {
                              next();
                            }
                          },
                        );
                      },
                      allDone,
                    );
                    function allDone(notAborted, arr) {
                      connectionSecond.end();
                      res.json({ Error: error });
                    }
                  }
                });
              } else {
                res.json({ Data: [] });
              }
            } else {
              res.json({ Data: "Error3" });
            }
          }
        },
      );
    }
  });
});

router.get("/organization", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT * FROM organization",
        function (err, result) {
          connectionMain.end();
          if (err) {
            res.json({ Data: "Error2" });
          } else {
            if (result && result.length) {
              let resultData = JSON.stringify(result);
              let json = JSON.parse(resultData);

              if (json && json.length) {
                connectionSecond.connect(function (err2) {
                  if (err2) {
                    connectionSecond.end();
                  } else {
                    async.forEach(
                      json,
                      function (returnObj, next) {
                        const sql = `
  INSERT INTO organization (
    id, address, approved_categories, brc_no, contact_no, credit_limit, 
  deposit_amount, discount, email, fax, highway, 
  invoicing_type, name, nbt, opening_date, receipt_number, 
  s_vat_no, secret, special_discount, svat, type, 
  vat, vat_no, receipt_date, logo, customer_code, 
  display_name, agreement_categories, svat_no, app_display_name, allowed_payment_delay, 
  is_non_agreement_categories, is_non_agreement_categories_allowed, invoicing_method, credit_limit_balance, running_balance, 
  is_approval_required_for_booking, is_disabled, is_category_discount_allowed, overall_discount_limit, overall_discount_rate, 
  overall_discount_type, approved_booking_categories, is_credit_limit_active, overall_discount_lower_limit_rate, booking_type, 
  old_customer_code, is_call_center_order_allowed, organization_category, is_check_monthly_usage, create_at_date, 
  update_at_date, monthly_check_date, nbt_no, insert_date, marketing_personnel_id, vehicle_rates
    ) VALUES (${Array(57).fill("?").join(", ")}); `;

                        const values = [
                          returnObj.id,
                          returnObj.address,
                          returnObj.approved_categories,
                          returnObj.brc_no,
                          returnObj.contact_no,
                          returnObj.credit_limit,
                          returnObj.deposit_amount,
                          returnObj.discount,
                          returnObj.email,
                          returnObj.fax,
                          returnObj.highway?.data?.[0] ?? null,
                          returnObj.invoicing_type,
                          returnObj.name,
                          returnObj.nbt,
                          returnObj.opening_date,
                          returnObj.receipt_number,
                          returnObj.s_vat_no,
                          returnObj.secret,
                          returnObj.special_discount,
                          returnObj.svat,
                          returnObj.type,
                          returnObj.vat,
                          returnObj.vat_no,
                          returnObj.receipt_date,
                          returnObj.logo,
                          returnObj.customer_code,
                          returnObj.display_name,
                          returnObj.agreement_categories,
                          returnObj.svat_no,
                          returnObj.app_display_name,
                          returnObj.allowed_payment_delay ?? null,
                          returnObj.is_non_agreement_categories ?? null,
                          returnObj.is_non_agreement_categories_allowed
                            ?.data?.[0] ?? null,
                          returnObj.invoicing_method,
                          returnObj.credit_limit_balance,
                          returnObj.running_balance,
                          returnObj.is_approval_required_for_booking
                            ?.data?.[0] ?? false,
                          returnObj.is_disabled ?? false,
                          returnObj.is_category_discount_allowed?.data?.[0] ??
                            false,
                          returnObj.overall_discount_limit,
                          returnObj.overall_discount_rate,
                          returnObj.overall_discount_type,
                          returnObj.approved_booking_categories,
                          returnObj.is_credit_limit_active?.data?.[0] ?? false,
                          returnObj.overall_discount_lower_limit_rate,
                          returnObj.booking_type,
                          returnObj.old_customer_code,
                          returnObj.is_call_center_order_allowed?.data?.[0] ??
                            false,
                          returnObj.organization_category,
                          returnObj.is_check_monthly_usage?.data?.[0] ?? false,
                          returnObj.create_at_date,
                          returnObj.update_at_date,
                          returnObj.monthly_check_date,
                          returnObj.nbt_no,
                          returnObj.insert_date,
                          returnObj.marketing_personnel_id,
                          returnObj.vehicle_rates
                            ? returnObj.vehicle_rates
                            : null,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              error.push(values);
                              console.error("Error inserting data:", err);
                              next();
                            } else {
                              next();
                            }
                          },
                        );
                      },
                      allDone,
                    );
                    function allDone(notAborted, arr) {
                      connectionSecond.end();
                      res.json({ Error: error });
                    }
                  }
                });
              } else {
                res.json({ Data: [] });
              }
            } else {
              res.json({ Data: "Error3" });
            }
          }
        },
      );
    }
  });
});

router.get("/organization_categories", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT * FROM organization_categories",
        function (err, result) {
          connectionMain.end();
          if (err) {
            res.json({ Data: "Error2" });
          } else {
            if (result && result.length) {
              let resultData = JSON.stringify(result);
              let json = JSON.parse(resultData);

              if (json && json.length) {
                connectionSecond.connect(function (err2) {
                  if (err2) {
                    connectionSecond.end();
                  } else {
                    async.forEach(
                      json,
                      function (returnObj, next) {
                        const sql = `
  INSERT INTO organization_categories (
    id, category_name, status 
    ) VALUES (${Array(3).fill("?").join(", ")}); `;

                        const values = [
                          returnObj.id,
                          returnObj.category_name,
                          returnObj.status,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              error.push(values);
                              console.error("Error inserting data:", err);
                              next();
                            } else {
                              next();
                            }
                          },
                        );
                      },
                      allDone,
                    );
                    function allDone(notAborted, arr) {
                      connectionSecond.end();
                      res.json({ Error: error });
                    }
                  }
                });
              } else {
                res.json({ Data: [] });
              }
            } else {
              res.json({ Data: "Error3" });
            }
          }
        },
      );
    }
  });
});

router.get("/over_payments", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT op.*, p.organization_id as org_id FROM over_payments op LEFT JOIN payments p ON op.payment_id = p.id",
        function (err, result) {
          connectionMain.end();
          if (err) {
            res.json({ Data: "Error2" });
          } else {
            if (result && result.length) {
              resultData = JSON.stringify(result);
              let json = JSON.parse(resultData);

              if (json && json.length) {
                connectionSecond.connect(function (err2) {
                  if (err2) {
                    connectionSecond.end();
                  } else {
                    async.forEach(
                      json,
                      function (returnObj, next) {
                        const sql = `
  INSERT INTO over_payments (
    id, amount, balance, organization, organization_id, receipt_id, payment_id, added_by  
    ) VALUES (${Array(8).fill("?").join(", ")}); `;

                        const values = [
                          returnObj.id,
                          returnObj.amount,
                          returnObj.balance,
                          returnObj.organization,
                          returnObj.org_id
                            ? returnObj.org_id
                            : null,
                          returnObj.receipt_id,
                          returnObj.payment_id,
                          returnObj.added_by,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              error.push(values);
                              console.error("Error inserting data:", err);
                              next();
                            } else {
                              next();
                            }
                          },
                        );
                      },
                      allDone,
                    );
                    function allDone(notAborted, arr) {
                      connectionSecond.end();
                      res.json({ Error: error });
                    }
                  }
                });
              } else {
                res.json({ Data: [] });
              }
            } else {
              res.json({ Data: "Error3" });
            }
          }
        },
      );
    }
  });
});

router.get("/payments", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query("SELECT * FROM payments", function (err, result) {
        connectionMain.end();
        if (err) {
          res.json({ Data: "Error2" });
        } else {
          if (result && result.length) {
            resultData = JSON.stringify(result);
            let json = JSON.parse(resultData);

            if (json && json.length) {
              connectionSecond.connect(function (err2) {
                if (err2) {
                  connectionSecond.end();
                } else {
                  async.forEach(
                    json,
                    function (returnObj, next) {
                      const sql = `
  INSERT INTO payments (
    id, date, amount, bank, method, number, type, cheque_date, balance, is_approved, is_cancelled, bank_code, branch_code,
     branch_name, created_date, branch_id, debt_collector_id, approved_by, cancelled_by, created_by, organization_id
    ) VALUES (${Array(21).fill("?").join(", ")}); `;

                      const values = [
                        returnObj.id,
                        returnObj.date,
                        returnObj.amount,
                        returnObj.bank,
                        returnObj.method,
                        returnObj.number,
                        returnObj.type,
                        returnObj.cheque_date,
                        returnObj.balance,
                        returnObj.is_approved?.data?.[0] ?? null,
                        returnObj.is_cancelled?.data?.[0] ?? null,
                        returnObj.bank_code,
                        returnObj.branch_code,
                        returnObj.branch_name,
                        returnObj.created_date,
                        returnObj.branch_id,
                        returnObj.debt_collector_id,
                        returnObj.approved_by,
                        returnObj.cancelled_by,
                        returnObj.created_by,
                        returnObj.organization_id,
                      ];

                      connectionSecond.query(
                        sql,
                        values,
                        function (err, result) {
                          if (err) {
                            error.push(values);
                            console.error("Error inserting data:", err);
                            next();
                          } else {
                            next();
                          }
                        },
                      );
                    },
                    allDone,
                  );
                  function allDone(notAborted, arr) {
                    connectionSecond.end();
                    res.json({ Error: error });
                  }
                }
              });
            } else {
              res.json({ Data: [] });
            }
          } else {
            res.json({ Data: "Error3" });
          }
        }
      });
    }
  });
});

router.get("/receipts", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query("SELECT * FROM receipts", function (err, result) {
        connectionMain.end();
        if (err) {
          res.json({ Data: "Error2" });
        } else {
          if (result && result.length) {
            resultData = JSON.stringify(result);
            let json = JSON.parse(resultData);

            if (json && json.length) {
              connectionSecond.connect(function (err2) {
                if (err2) {
                  connectionSecond.end();
                } else {
                  async.forEach(
                    json,
                    function (returnObj, next) {
                      const sql = `INSERT INTO receipts (
     id, date, is_approved, number, type, is_cancelled, vehicular_type, paid,
  end_balance_of_payment, reason, org_name, email_addresses, is_email_sent,
  sent_time, kangaroo_account_number, approved_by, created_by, organization_id,
  payment_id, cancelled_by, department_id, over_payment_id
    ) VALUES (${Array(22).fill("?").join(", ")}); `;

                      const values = [
                        returnObj.id,
                        returnObj.date,
                        returnObj.is_approved?.data?.[0] ?? null,
                        returnObj.number,
                        returnObj.type,
                        returnObj.is_cancelled?.data?.[0] ?? null,
                        returnObj.vehicular_type,
                        returnObj.paid,
                        returnObj.end_balance_of_payment,
                        returnObj.reason,
                        returnObj.org_name,
                        returnObj.email_addresses,
                        returnObj.is_email_sent?.data?.[0] ?? null,
                        returnObj.sent_time,
                        returnObj.kangaroo_account_number,
                        returnObj.approved_by,
                        returnObj.created_by,
                        returnObj.organization_id,
                        returnObj.payment_id,
                        returnObj.cancelled_by,
                        returnObj.department_id,
                        returnObj.over_payment_id,
                      ];

                      connectionSecond.query(
                        sql,
                        values,
                        function (err, result) {
                          if (err) {
                            error.push(values);
                            console.error("Error inserting data:", err);
                            next();
                          } else {
                            next();
                          }
                        },
                      );
                    },
                    allDone,
                  );
                  function allDone(notAborted, arr) {
                    connectionSecond.end();
                    res.json({ Error: error });
                  }
                }
              });
            } else {
              res.json({ Data: [] });
            }
          } else {
            res.json({ Data: "Error3" });
          }
        }
      });
    }
  });
});

router.get("/receipt_invoices", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT * FROM receipt_invoices",
        function (err, result) {
          connectionMain.end();
          if (err) {
            res.json({ Data: "Error2" });
          } else {
            if (result && result.length) {
              resultData = JSON.stringify(result);
              let json = JSON.parse(resultData);

              if (json && json.length) {
                connectionSecond.connect(function (err2) {
                  if (err2) {
                    connectionSecond.end();
                  } else {
                    async.forEach(
                      json,
                      function (returnObj, next) {
                        const sql = `INSERT INTO receipt_invoices (
     id, paid, due_days, due, outstanding, certificate_due, certificate_outstanding, certificate_paid, invoice_id, receipt_id 
    ) VALUES (${Array(10).fill("?").join(", ")}); `;

                        const values = [
                          returnObj.id,
                          returnObj.paid,
                          returnObj.due_days,
                          returnObj.due,
                          returnObj.outstanding,
                          returnObj.certificate_due,
                          returnObj.certificate_outstanding,
                          returnObj.certificate_paid,
                          returnObj.invoice_id,
                          returnObj.receipt_id,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              error.push(values);
                              console.error("Error inserting data:", err);
                              next();
                            } else {
                              next();
                            }
                          },
                        );
                      },
                      allDone,
                    );
                    function allDone(notAborted, arr) {
                      connectionSecond.end();
                      res.json({ Error: error });
                    }
                  }
                });
              } else {
                res.json({ Data: [] });
              }
            } else {
              res.json({ Data: "Error3" });
            }
          }
        },
      );
    }
  });
});

router.get("/user", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query("SELECT * FROM user", function (err, result) {
        connectionMain.end();
        if (err) {
          res.json({ Data: "Error2" });
        } else {
          if (result && result.length) {
            resultData = JSON.stringify(result);
            let json = JSON.parse(resultData);

            if (json && json.length) {
              connectionSecond.connect(function (err2) {
                if (err2) {
                  connectionSecond.end();
                } else {
                  async.forEach(
                    json,
                    function (returnObj, next) {
                      const sql = `INSERT INTO user (
    id, contact_number, email, password, user_type, username, external_jwt_token, is_created, random_password, created_by_user,
    is_deleted, auth_admins, auth_all_bookings, auth_approve_booking, auth_department, is_booking_available, is_email_available, is_invoice_available,
    is_join_request_available, is_message_available, auth_users, organization_id, department_id 
    ) VALUES (${Array(23).fill("?").join(", ")}); `;

                      const values = [
                        returnObj.id,
                        returnObj.contact_number,
                        returnObj.email,
                        returnObj.password,
                        returnObj.user_type,
                        returnObj.username,
                        returnObj.external_jwt_token,
                        returnObj.is_created?.data?.[0] ?? null,
                        returnObj.random_password,
                        returnObj.created_by_user,
                        returnObj.is_deleted?.data?.[0] ?? null,
                        returnObj.auth_admins,
                        returnObj.auth_all_bookings,
                        returnObj.auth_approve_booking,
                        returnObj.auth_department,
                        returnObj.is_booking_available?.data?.[0] ?? null,
                        returnObj.is_email_available?.data?.[0] ?? null,
                        returnObj.is_invoice_available?.data?.[0] ?? null,
                        returnObj.is_join_request_available?.data?.[0] ?? null,
                        returnObj.is_message_available?.data?.[0] ?? null,
                        returnObj.auth_users,
                        returnObj.organization_id,
                        returnObj.department_id,
                      ];

                      connectionSecond.query(
                        sql,
                        values,
                        function (err, result) {
                          if (err) {
                            error.push(values);
                            console.error("Error inserting data:", err);
                            next();
                          } else {
                            next();
                          }
                        },
                      );
                    },
                    allDone,
                  );
                  function allDone(notAborted, arr) {
                    connectionSecond.end();
                    res.json({ Error: error });
                  }
                }
              });
            } else {
              res.json({ Data: [] });
            }
          } else {
            res.json({ Data: "Error3" });
          }
        }
      });
    }
  });
});

router.get("/vat_rates", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query("SELECT * FROM vat_rates", function (err, result) {
        connectionMain.end();
        if (err) {
          res.json({ Data: "Error2" });
        } else {
          if (result && result.length) {
            let resultData = JSON.stringify(result);
            let json = JSON.parse(resultData);

            if (json && json.length) {
              connectionSecond.connect(function (err2) {
                if (err2) {
                  connectionSecond.end();
                } else {
                  async.forEach(
                    json,
                    function (returnObj, next) {
                      const sql = `INSERT INTO vat_rates ( id, nbt, vat, wht ) VALUES (${Array(4).fill("?").join(", ")}); `;

                      const values = [
                        returnObj.id,
                        returnObj.nbt,
                        returnObj.vat,
                        returnObj.wht,
                      ];

                      connectionSecond.query(
                        sql,
                        values,
                        function (err, result) {
                          if (err) {
                            error.push(values);
                            console.error("Error inserting data:", err);
                            next();
                          } else {
                            next();
                          }
                        },
                      );
                    },
                    allDone,
                  );
                  function allDone(notAborted, arr) {
                    connectionSecond.end();
                    res.json({ Error: error });
                  }
                }
              });
            } else {
              res.json({ Data: [] });
            }
          } else {
            res.json({ Data: "Error3" });
          }
        }
      });
    }
  });
});

router.get("/vat_rates_edit_history", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT * FROM vat_rates_edit_history",
        function (err, result) {
          connectionMain.end();
          if (err) {
            res.json({ Data: "Error2" });
          } else {
            if (result && result.length) {
              resultData = JSON.stringify(result);
              let json = JSON.parse(resultData);

              if (json && json.length) {
                connectionSecond.connect(function (err2) {
                  if (err2) {
                    connectionSecond.end();
                  } else {
                    async.forEach(
                      json,
                      function (returnObj, next) {
                        const sql = `INSERT INTO vat_rates_edit_history ( id, previous_value, time_of_update, updated_field, updated_value, edit_by ) VALUES (${Array(6).fill("?").join(", ")}); `;

                        const values = [
                          returnObj.id,
                          returnObj.previous_value,
                          returnObj.time_of_update,
                          returnObj.updated_field,
                          returnObj.updated_value,
                          returnObj.edit_by,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              error.push(values);
                              console.error("Error inserting data:", err);
                              next();
                            } else {
                              next();
                            }
                          },
                        );
                      },
                      allDone,
                    );
                    function allDone(notAborted, arr) {
                      connectionSecond.end();
                      res.json({ Error: error });
                    }
                  }
                });
              } else {
                res.json({ Data: [] });
              }
            } else {
              res.json({ Data: "Error3" });
            }
          }
        },
      );
    }
  });
});

// router.get('/org_vehicle_rates', function (req, res, next) {
//     const connectionMain = mysql.createConnection(connection1);
//     const connectionSecond = mysql.createConnection(connection2);
//     let error = [];

//     let company = {};
//     let key = {};

//     connectionMain.connect(function (err) {
//         if (err) {
//             connectionMain.end();
//             res.json({ "Data": "Error1" });
//         } else {
//             connectionMain.query('SELECT * FROM vehicle_rate', function (err, result) {
//                 connectionMain.end();
//                 if (err) {
//                     res.json({ "Data": "Error2" });
//                 } else {
//                     if (result && result.length) {
//                         resultData = JSON.stringify(result);
//                         let json = JSON.parse(resultData);

//                         if (json && json.length) {

//                             connectionSecond.connect(function (err2) {
//                                 if (err2) {
//                                     connectionSecond.end();
//                                 } else {
//                                     async.forEach(json, function (returnObj, next) {
//                                         // console.log(returnObj.organization_id, 'returnObj.organization_id');

//                                         const orgId = returnObj.organization_id;

//                                         if (!company[orgId]) {
//                                             company[orgId] = [];
//                                         }

//                                         if (returnObj.sub_van_rates?.data[0] || returnObj.sub_car_rates?.data[0] || returnObj.sub_budget_rates?.data[0]) {

//                                             if (returnObj.sub_van_rates?.data[0]) {
//                                                 let existing = company[orgId].find(item => item.type === "Van");
//                                                 if (existing) {
//                                                     existing['sub_van_rates'] = returnObj.sub_van_rates;
//                                                     existing['buddy_van_callup'] = returnObj.buddy_van_callup?.data[0];
//                                                     existing['buddy_van_minimum_charge'] = returnObj.buddy_van_minimum_charge;
//                                                     existing['buddy_van_minimum_km'] = returnObj.buddy_van_minimum_km;
//                                                     existing['buddy_van_per_km_rate'] = returnObj.buddy_van_per_km_rate;
//                                                     existing['buddy_van_per_waiting_rate'] = returnObj.buddy_van_per_waiting_rate;

//                                                     existing['mini_van_callup'] = returnObj.mini_van_callup?.data[0];
//                                                     existing['mini_van_minimum_charge'] = returnObj.mini_van_minimum_charge;
//                                                     existing['mini_van_minimum_km'] = returnObj.mini_van_minimum_km;
//                                                     existing['mini_van_per_km_rate'] = returnObj.mini_van_per_km_rate;
//                                                     existing['mini_van_per_waiting_rate'] = returnObj.mini_van_per_waiting_rate;
//                                                     next();

//                                                 } else {
//                                                     company[orgId].push({
//                                                         organization_id: orgId,
//                                                         per_km_rate: returnObj.per_km_rate,
//                                                         type: returnObj.type,
//                                                         waiting_rate: returnObj.waiting_rate,
//                                                         discount: returnObj.discount,
//                                                         invoicing_type: returnObj.invoicing_type,
//                                                         nbt: returnObj.nbt?.data?.[0] ?? null,
//                                                         special_discount: returnObj.special_discount,
//                                                         start_date: returnObj.start_date,
//                                                         svat: returnObj.svat?.data?.[0] ?? null,
//                                                         vat: returnObj.vat?.data?.[0] ?? null,
//                                                         callup: returnObj.callup?.data?.[0] ?? null,
//                                                         credit_limit: returnObj.credit_limit,
//                                                         minimum_charge: returnObj.minimum_charge,
//                                                         minimum_km: returnObj.minimum_km,
//                                                         special_rates: returnObj.special_rates?.data?.[0] ?? null,
//                                                         wht: returnObj.wht?.data?.[0] ?? null,
//                                                         sub_van_rates: returnObj.sub_van_rates?.data[0],
//                                                         sub_car_rates: returnObj.sub_car_rates?.data[0],
//                                                         sub_budget_rates: returnObj.sub_budget_rates?.data[0],
//                                                         buddy_van_callup: returnObj.buddy_van_callup?.data[0],
//                                                         buddy_van_minimum_charge: returnObj.buddy_van_minimum_charge,
//                                                         buddy_van_minimum_km: returnObj.buddy_van_minimum_km,
//                                                         buddy_van_per_km_rate: returnObj.buddy_van_per_km_rate,
//                                                         buddy_van_per_waiting_rate: returnObj.buddy_van_per_waiting_rate,
//                                                         mini_van_callup: returnObj.mini_van_callup?.data[0],
//                                                         mini_van_minimum_charge: returnObj.mini_van_minimum_charge,
//                                                         mini_van_minimum_km: returnObj.mini_van_minimum_km,
//                                                         mini_van_per_km_rate: returnObj.mini_van_per_km_rate,
//                                                         mini_van_per_waiting_rate: returnObj.mini_van_per_waiting_rate
//                                                     });
//                                                     next();
//                                                 }
//                                             } else if (returnObj.sub_budget_rates?.data[0]) {

//                                                 let existing = company[orgId].find(item => item.type === "Budget");
//                                                 if (existing) {
//                                                     existing['sub_budget_rates'] = returnObj.sub_budget_rates?.data[0];
//                                                     existing['expo_callup'] = returnObj.expo_callup?.data[0];
//                                                     existing['expo_minimum_charge'] = returnObj.expo_minimum_charge;
//                                                     existing['expo_minimum_km'] = returnObj.expo_minimum_km;
//                                                     existing['expo_per_km_rate'] = returnObj.expo_per_km_rate;
//                                                     existing['expo_per_waiting_rate'] = returnObj.expo_per_waiting_rate;
//                                                     next();

//                                                 } else {
//                                                     company[orgId].push({
//                                                         organization_id: orgId,
//                                                         per_km_rate: returnObj.per_km_rate,
//                                                         type: returnObj.type,
//                                                         waiting_rate: returnObj.waiting_rate,
//                                                         discount: returnObj.discount,
//                                                         invoicing_type: returnObj.invoicing_type,
//                                                         nbt: returnObj.nbt?.data?.[0] ?? null,
//                                                         special_discount: returnObj.special_discount,
//                                                         start_date: returnObj.start_date,
//                                                         svat: returnObj.svat?.data?.[0] ?? null,
//                                                         vat: returnObj.vat?.data?.[0] ?? null,
//                                                         callup: returnObj.callup?.data?.[0] ?? null,
//                                                         credit_limit: returnObj.credit_limit,
//                                                         minimum_charge: returnObj.minimum_charge,
//                                                         minimum_km: returnObj.minimum_km,
//                                                         special_rates: returnObj.special_rates?.data?.[0] ?? null,
//                                                         wht: returnObj.wht?.data?.[0] ?? null,
//                                                         sub_van_rates: returnObj.sub_van_rates?.data[0],
//                                                         sub_car_rates: returnObj.sub_car_rates?.data[0],
//                                                         sub_budget_rates: returnObj.sub_budget_rates?.data[0],
//                                                         expo_callup: returnObj.expo_callup?.data[0],
//                                                         expo_minimum_charge: returnObj.expo_minimum_charge,
//                                                         expo_minimum_km: returnObj.expo_minimum_km,
//                                                         expo_per_km_rate: returnObj.expo_per_km_rate,
//                                                         expo_per_waiting_rate: returnObj.expo_per_waiting_rate
//                                                     });
//                                                     next();
//                                                 }

//                                             } else if (returnObj.sub_car_rates?.data[0]) {

//                                                 let existing = company[orgId].find(item => item.type === "Car");
//                                                 if (existing) {
//                                                     existing['sub_car_rates'] = returnObj.sub_car_rates.data[0];
//                                                     existing['semi_callup'] = returnObj.semi_callup?.data[0];
//                                                     existing['semi_minimum_charge'] = returnObj.semi_minimum_charge;
//                                                     existing['semi_minimum_km'] = returnObj.semi_minimum_km;
//                                                     existing['semi_per_km_rate'] = returnObj.semi_per_km_rate;
//                                                     existing['semi_per_waiting_rate'] = returnObj.semi_per_waiting_rate;
//                                                     next();

//                                                 } else {
//                                                     company[orgId].push({
//                                                         organization_id: orgId,
//                                                         per_km_rate: returnObj.per_km_rate,
//                                                         type: returnObj.type,
//                                                         waiting_rate: returnObj.waiting_rate,
//                                                         discount: returnObj.discount,
//                                                         invoicing_type: returnObj.invoicing_type,
//                                                         nbt: returnObj.nbt?.data?.[0] ?? null,
//                                                         special_discount: returnObj.special_discount,
//                                                         start_date: returnObj.start_date,
//                                                         svat: returnObj.svat?.data?.[0] ?? null,
//                                                         vat: returnObj.vat?.data?.[0] ?? null,
//                                                         callup: returnObj.callup?.data?.[0] ?? null,
//                                                         credit_limit: returnObj.credit_limit,
//                                                         minimum_charge: returnObj.minimum_charge,
//                                                         minimum_km: returnObj.minimum_km,
//                                                         special_rates: returnObj.special_rates?.data?.[0] ?? null,
//                                                         wht: returnObj.wht?.data?.[0] ?? null,
//                                                         sub_van_rates: returnObj.sub_van_rates?.data[0],
//                                                         sub_car_rates: returnObj.sub_car_rates?.data[0],
//                                                         sub_budget_rates: returnObj.sub_budget_rates?.data[0],
//                                                         semi_callup: returnObj.semi_callup?.data[0],
//                                                         semi_minimum_charge: returnObj.semi_minimum_charge,
//                                                         semi_minimum_km: returnObj.semi_minimum_km,
//                                                         semi_per_km_rate: returnObj.semi_per_km_rate,
//                                                         semi_per_waiting_rate: returnObj.semi_per_waiting_rate
//                                                     });
//                                                     next();
//                                                 }

//                                             } else {
//                                                 next();
//                                             }

//                                         } else {

//                                             company[orgId].push({
//                                                 organization_id: orgId,
//                                                 call_up_additional_perkm: returnObj.call_up_additional_perkm,
//                                                 call_up_base_amount_perkm: returnObj.call_up_base_amount_perkm,
//                                                 per_km_rate: returnObj.per_km_rate,
//                                                 type: returnObj.type,
//                                                 waiting_rate: returnObj.waiting_rate,
//                                                 discount: returnObj.discount,
//                                                 invoicing_type: returnObj.invoicing_type,
//                                                 nbt: returnObj.nbt?.data?.[0] ?? null,
//                                                 special_discount: returnObj.special_discount,
//                                                 start_date: returnObj.start_date,
//                                                 svat: returnObj.svat?.data?.[0] ?? null,
//                                                 vat: returnObj.vat?.data?.[0] ?? null,
//                                                 callup: returnObj.callup?.data?.[0] ?? null,
//                                                 credit_limit: returnObj.credit_limit,
//                                                 minimum_charge: returnObj.minimum_charge,
//                                                 minimum_km: returnObj.minimum_km,
//                                                 special_rates: returnObj.special_rates?.data?.[0] ?? null,
//                                                 wht: returnObj.wht?.data?.[0] ?? null,
//                                                 sub_van_rates: returnObj.sub_van_rates?.data[0],
//                                                 sub_car_rates: returnObj.sub_car_rates?.data[0],
//                                                 sub_budget_rates: returnObj.sub_budget_rates?.data[0]
//                                             });

//                                             next();
//                                         }
//                                     }, allDone);

//                                     function allDone(notAborted, arr) {

//                                         async.forEach(company, function (item1, next1) {

//                                             if (item1.length) {

//                                                 const sql = ` UPDATE organization1
//                                                     SET
//                                                     vehicle_rates = ?,
//                                                     invoicing_generate_type = ?
//                                                     WHERE id = ?;`;

//                                                     const values = [
//                                                         JSON.stringify(item1),
//                                                         item1[0].invoicing_type,
//                                                         item1[0].organization_id
//                                                     ];

//                                                 // async.forEach(item1, function (subItem, subNext) {

//                                                 //     const sql = ` UPDATE organization
//                                                 //     SET
//                                                 //     vehicle_rates = JSON_ARRAY_APPEND(vehicle_rates, '$', CAST(? AS JSON)),
//                                                 //     invoicing_generate_type = ?,
//                                                 //     WHERE id = ?;`;

//                                                 //     let ff = { ...subItem };

//                                                 //     delete ff.organization_id;
//                                                 //     delete ff.invoicing_type;

//                                                 //     const values = [
//                                                 //         JSON.stringify(ff),
//                                                 //         subItem.invoicing_type,
//                                                 //         subItem.organization_id
//                                                 //     ];
//                                                     connectionSecond.query(sql, values, function (err, result) {
//                                                         if (err) {
//                                                             error.push(values);
//                                                             console.error('Error inserting data:', err);
//                                                             next1();
//                                                         } else {
//                                                             next1();
//                                                         }
//                                                     });
//                                                 // }, allSubDone)
//                                                 // function allSubDone(notAborted, arr) {
//                                                     // next1();
//                                                 // }

//                                             } else {
//                                                 next1();
//                                             }

//                                         }, allDone1);

//                                         function allDone1(notAborted, arr) {
//                                             connectionSecond.end();

//                                             res.json({ "error": error, "result": company });
//                                         }
//                                     }
//                                 }
//                             });

//                         } else {
//                             res.json({ "Data": [] });
//                         }

//                     } else {
//                         res.json({ "Data": "Error3" });
//                     }
//                 }
//             });
//         }
//     });
// })

router.get("/org_vehicle_rates", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  let company = {};

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      return res.json({ Data: "Error1" });
    }

    connectionMain.query("SELECT * FROM vehicle_rate", function (err, result) {
      connectionMain.end();

      if (err) return res.json({ Data: "Error2" });
      if (!result || !result.length) return res.json({ Data: [] });

      const json = JSON.parse(JSON.stringify(result));

      connectionSecond.connect(function (err2) {
        if (err2) return connectionSecond.end();

        async.forEach(
          json,
          function (r, next) {
            const orgId = r.organization_id;

            if (!company[orgId]) company[orgId] = [];

            const mapped = mapVehicleRate(r);

            const existing = company[orgId].find(
              (item) => item.type === mapped.type,
            );

            if (existing) {
              Object.assign(existing, mapped);
            } else {
              company[orgId].push(mapped);
            }

            next();
          },
          function () {
            async.forEach(
              Object.keys(company),
              function (orgId, next1) {
                const list = company[orgId];

                if (!list.length) return next1();

                const sql = `
                            UPDATE organization
                            SET 
                                vehicle_rates = ?,
                                invoicing_generate_type = ?
                            WHERE id = ?;
                        `;

                const values = [
                  JSON.stringify(list),
                  list[0].invoicing_type,
                  parseInt(orgId),
                ];

                connectionSecond.query(sql, values, function (err) {
                  if (err) {
                    error.push(values);
                    console.error("Error:", err);
                  }
                  next1();
                });
              },
              function () {
                connectionSecond.end();
                res.json({ error, result: company });
              },
            );
          },
        );
      });
    });
  });

  function mapVehicleRate(r) {
    return {
      type: r.type,

      call_up_base_amount_per_km: r.call_up_base_amount_per_km ?? 0,
      call_up_additional_per_km: r.call_up_additional_per_km ?? 0,

      invoicing_type: r.invoicing_type,
      discount: r.discount ?? 0,
      special_discount: r.special_discount ?? 0,

      vat: r.vat?.data?.[0] ? true : false,
      nbt: r.nbt?.data?.[0] ? true : false,
      svat: r.svat?.data?.[0] ? true : false,
      wht: r.wht?.data?.[0] ? true : false,

      start_date: r.start_date,
      credit_limit: r.credit_limit ?? 0,
      special_rates: r.special_rates?.data?.[0] ? true : false,

      minimum_charge: r.minimum_charge ?? 0,
      minimum_km: r.minimum_km ?? 0,
      per_km_rate: r.per_km_rate ?? 0,
      waiting_rate: r.waiting_rate ?? 0,
      callup: r.callup?.data?.[0] ? true : false,

      // VAN
      sub_van_rates: r.sub_van_rates?.data?.[0] ? true : false,
      buddy_van_minimum_charge: r.buddy_van_minimum_charge ?? 0,
      buddy_van_minimum_km: r.buddy_van_minimum_km ?? 0,
      buddy_van_per_km_rate: r.buddy_van_per_km_rate ?? 0,
      buddy_van_waiting_rate: r.buddy_van_waiting_rate ?? 0,
      buddy_van_callup: r.buddy_van_callup?.data?.[0] ? true : false,

      mini_van_minimum_charge: r.mini_van_minimum_charge ?? 0,
      mini_van_minimum_km: r.mini_van_minimum_km ?? 0,
      mini_van_per_km_rate: r.mini_van_per_km_rate ?? 0,
      mini_van_waiting_rate: r.mini_van_waiting_rate ?? 0,
      mini_van_callup: r.mini_van_callup?.data?.[0] ? true : false,

      // BUDGET
      sub_budget_rates: r.sub_budget_rates?.data?.[0] ? true : false,
      expo_minimum_charge: r.expo_minimum_charge ?? 0,
      expo_minimum_km: r.expo_minimum_km ?? 0,
      expo_per_km_rate: r.expo_per_km_rate ?? 0,
      expo_waiting_rate: r.expo_waiting_rate ?? 0,
      expo_callup: r.expo_callup?.data?.[0] ? true : false,

      // CAR
      sub_car_rates: r.sub_car_rates?.data?.[0] ? true : false,
      semi_minimum_charge: r.semi_minimum_charge ?? 0,
      semi_minimum_km: r.semi_minimum_km ?? 0,
      semi_per_km_rate: r.semi_per_km_rate ?? 0,
      semi_waiting_rate: r.semi_waiting_rate ?? 0,
      semi_callup: r.semi_callup?.data?.[0] ? true : false,
    };
  }
});

export default router;
