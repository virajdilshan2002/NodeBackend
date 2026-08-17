import express from "express";
import mysql from "mysql";

const router = express.Router();

// const testDb = {
//   host: "192.168.1.11",
//   user: "kangaroo",
//   password: "kan588",
//   database: "corporate_master",
// };

const testDb = {
  host: "192.168.1.10",
  user: "usr_local",
  password: "lobos681",
  database: "corporate_master",
};

router.get("/update-tin-numbers", function (req, res) {
  const connection = mysql.createConnection(testDb);
  const updatedInvoiceNumbers = [];

  connection.connect(function (err) {
    if (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }

    connection.beginTransaction(async function (err) {
      if (err) {
        connection.end();
        return res.status(500).json({
          success: false,
          error: err.message,
        });
      }

      connection.query(
        `
        SELECT id, name, vat_no, svat_no
        FROM organization
        WHERE vat_no IS NOT NULL
           OR svat_no IS NOT NULL
        `,
        async (err, organizations) => {
          if (err) {
            return connection.rollback(function () {
              connection.end();
              res.status(500).json({
                success: false,
                error: err.message,
              });
            });
          }

          try {
            await Promise.all(
              organizations.map(
                (org) =>
                  new Promise((resolve, reject) => {
                    connection.query(
                      `
                      SELECT id, number
                      FROM invoices
                      WHERE organization_id = ?
                        AND is_cancelled = 0
                        AND type LIKE '%vat%'
                        AND vat_no IS NULL
                        AND svat_no IS NULL
                      `,
                      [org.id],
                      (err, invoices) => {
                        if (err) {
                          return reject(err);
                        }

                        if (!invoices.length) {
                          return resolve();
                        }

                        connection.query(
                          `
                          UPDATE invoices
                          SET vat_no = ?, svat_no = ?
                          WHERE organization_id = ?
                            AND is_cancelled = 0
                            AND type LIKE '%vat%'
                            AND vat_no IS NULL
                            AND svat_no IS NULL
                          `,
                          [org.vat_no, org.svat_no, org.id],
                          (err) => {
                            if (err) {
                              return reject(err);
                            }

                            invoices.forEach((inv) => {
                              updatedInvoiceNumbers.push(inv.number);

                              console.log(
                                `Updated Invoice ${inv.number} (${org.name})`
                              );
                            });

                            resolve();
                          }
                        );
                      }
                    );
                  })
              )
            );

            connection.commit(function (err) {
              if (err) {
                return connection.rollback(function () {
                  connection.end();
                  res.status(500).json({
                    success: false,
                    error: err.message,
                  });
                });
              }

              connection.end();

              res.json({
                success: true,
                updatedCount: updatedInvoiceNumbers.length,
                updatedInvoiceNumbers,
              });
            });
          } catch (err) {
            connection.rollback(function () {
              connection.end();

              res.status(500).json({
                success: false,
                error: err.message,
              });
            });
          }
        }
      );
    });
  });
});

router.get("/clear-invoice-tin-numbers", function (req, res) {
  const connection = mysql.createConnection(testDb);

  connection.connect(function (err) {
    if (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }

    connection.query(
      `
      UPDATE invoices
      SET
        vat_no = NULL,
        svat_no = NULL
      `,
      (err, result) => {
        connection.end();

        if (err) {
          return res.status(500).json({
            success: false,
            error: err.message,
          });
        }

        res.json({
          success: true,
          message: "Invoice TIN numbers cleared successfully.",
          affectedRows: result.affectedRows,
        });
      }
    );
  });
});

export default router;
