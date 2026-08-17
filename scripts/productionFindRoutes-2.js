import express from "express";
import mysql from "mysql";

const router = express.Router();

const productDB = {
  host: "192.168.1.10",
  user: "usr_local",
  password: "lobos681",
  database: "corporate_master",
};

router.get("/scripted", async function (req, res) {
  const connection = mysql.createConnection(productDB);

  try {
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const promises = orgIds.map(
      (orgId) =>
        new Promise((resolve, reject) => {
          const query = `
            SELECT COUNT(*) AS count
            FROM voucher
            WHERE updated_by_script = 1
              AND organization_id = ?
          `;

          connection.query(query, [orgId], (err, results) => {
            if (err) {
              return reject(err);
            }

            resolve(results[0].count);
          });
        })
    );

    const data = await Promise.all(promises);

    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  } finally {
    connection.end();
  }
});

router.get("/newly-added", async function (req, res) {
  const connection = mysql.createConnection(productDB);

  try {
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const promises = orgIds.map(
      (orgId) =>
        new Promise((resolve, reject) => {
          const query = `
            SELECT COUNT(*) AS count
            FROM voucher
            WHERE updated_by_script = 0
              AND organization_id = ?
          `;

          connection.query(query, [orgId], (err, results) => {
            if (err) {
              return reject(err);
            }

            // resolve({
            //   orgId,
            //   newly_added_count: results[0].count,
            // });

            resolve(results[0].count);
          });
        })
    );

    const data = await Promise.all(promises);

    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  } finally {
    connection.end();
  }
});

router.get("/voucher-bookings", async function (req, res) {
  const connection = mysql.createConnection(productDB);

  connection.connect(async function (err) {
    if (err) {
      console.error(err);
      return res.json({ error: err });
    }

    try {
      const promises = orgIds.map(
        (orgId) =>
          new Promise((resolve, reject) => {
            connection.query(
              `SELECT b.id, b.ref_id, b.total_fare, b.bill_number, b.department_id, d.payment_token
               FROM booking b
               LEFT JOIN department d ON b.department_id = d.id
               WHERE b.bill_number IS NOT NULL AND b.organization_id = ?`,
              [orgId],
              (err, bookings) => {
                if (err) {
                  return reject(err);
                }

                resolve({
                  orgId,
                  bookings_count: bookings.length,
                  bookings,
                });
              }
            );
          })
      );

      const resultData = await Promise.all(promises);

      connection.end();

      return res.json(resultData);
    } catch (err) {
      connection.end();
      return res.status(500).json({ error: err });
    }
  });
});

const orgIds = [
  290281,
  300991,
  540997,
  632236,
  1163799,
  1640170,
  2264377,
  2322315,
  32568,
  480050,
  2169922,
  909,
  72309,
  303417,
  373255,
  1025955,
  1145,
  210768,
  1059110,
  343192,
  1138531,
  1233534,
  3190,
  41139,
  812508,
  330,
  6567,
  432800,
  56972,
  2078140,
  661743,
  717137,
  200395,
  291764,
  939,
  9718,
  411432,
  2392625,
  1178,
  2762,
  11057,
  11099,
  27581,
  57058,
  238786,
  425124,
  428143,
  428151,
  566180,
  645157,
  1057170,
  2753885,
  11645,
  326866,
  9726,
  25884,
  496713,
  1965055,
  1018,
  2714625,
  9731,
  72299,
  287745,
  399479,
  2936962,
];

export default router;
