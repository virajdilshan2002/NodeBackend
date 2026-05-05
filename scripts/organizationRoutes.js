import express from "express";
import mysql from "mysql";
import async from "async";
import moment from "moment";

const router = express.Router();
let resultData;

const db = {
  host: "192.168.1.11",
  user: "kangaroo",
  password: "kan588",
  database: "1_corporate_master",
};

router.get("/org_vehicle_rates_sp", function (req, res, next) {
  const connection = mysql.createConnection(db);
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

  connection.connect(function (err2) {
    if (err2) {
      console.error("DB connection error:", err2);
      connection.end();
      return res.json({ error: err2 });
    }

    connection.query(
      "SELECT id, vehicle_rates FROM organization",
      function (err, orgs) {
        if (err) {
          connection.end();
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
              // return nextOrg();
            }

            const sql =
              "UPDATE organization SET discount=?, special_discount=? WHERE id=?";

            const values = [
              JSON.stringify(discount),
              JSON.stringify(special_discount),
              org.id,
            ];

            connection.query(sql, values, function (errUpdate) {
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
            connection.end();
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

router.get("/org_vehicle_rates_update", function (req, res, next) {
  const connection = mysql.createConnection(db);
  let error = [];

  connection.connect(function (err) {
    if (err) {
      connection.end();
      return res.json({ Data: "Error1" });
    }

    connection.query(
      "SELECT * FROM organization WHERE vehicle_rates IS NULL",
      function (err, result) {
        if (err) return res.json({ Data: "Error2 -", err });
        if (!result || !result.length) return res.json({ Data: [] });

        const orgs = JSON.parse(JSON.stringify(result));

        async.forEach(
          orgs,
          function (org, next) {
            const sql = `SELECT vehicle_rates FROM organizationold WHERE id = ?`;
            connection.query(sql, [org.id], function (err, result) {
              if (err) {
                error.push({ orgId: org.id, reason: err });
                console.error(
                  "Error fetching vehicle rates for org:",
                  org.id,
                  err,
                );
                return next();
              }

              if (!result || !result.length) {
                error.push({
                  orgId: org.id,
                  reason: "No data in organizationold",
                });
                console.warn(
                  "No vehicle rates found for org in organizationold:",
                  org.id,
                );
                return next();
              }

              let vehicleRates = null;

              try {
                vehicleRates = JSON.parse(result[0].vehicle_rates);
              } catch (e) {
                error.push({
                  orgId: org.id,
                  reason: "Invalid JSON in organizationold",
                });
                console.warn(
                  "Invalid JSON for org in organizationold:",
                  org.id,
                );
                return next();
              }

              const mappedRates = Array.isArray(vehicleRates)
                ? vehicleRates.map(mapVehicleRate)
                : [];

              const updateSql = `UPDATE organization SET vehicle_rates = ? WHERE id = ?`;
              connection.query(
                updateSql,
                [JSON.stringify(mappedRates), org.id],
                function (err, updateResult) {
                  if (err) {
                    error.push({ orgId: org.id, reason: err });
                    console.error(
                      "Error updating vehicle rates for org:",
                      org.id,
                      err,
                    );
                    return next();
                  } else {
                    console.log("Updated vehicle rates for org:", org.id);
                    return next();
                  }
                },
              );
            });
          },
          function allDone() {
            connection.end();
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
