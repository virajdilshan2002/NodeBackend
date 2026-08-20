import express from "express";
import mysql from "mysql";
import moment from "moment";

const router = express.Router();

const testDb = {
  host: "192.168.1.11",
  user: "kangaroo",
  password: "kan588",
  database: "1_corporate_master_prod",
};

// const testDb = {
//   host: "localhost",
//   user: "admin",
//   password: "viraj@2588",
//   database: "c_corporate_prod_test",
// };

// const productDB = {
//   host: "192.168.1.10",
//   user: "usr_local",
//   password: "lobos681",
//   database: "corporate_master",
// };

// const localDb = {
//   host: "localhost",
//   user: "admin",
//   password: "viraj@2588",
//   database: "corporate_master",
// };

router.get("/update-payments-and-deductions-for-departments",
  function (req, res) {
    const connection = mysql.createConnection(testDb);

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

        try {
          const departmentsQuery = `
            SELECT department_id
            FROM invoices_script
            WHERE is_cancelled = 0
              AND invoicing_method LIKE '%Department%'
              AND number NOT LIKE '%Blank%'
              AND department_id IS NOT NULL
            GROUP BY department_id
          `;

          const departments = await query(connection, departmentsQuery);
          // const departments = [1063705];

          const vehiclecategories = ['V','K','B','C'];

          let totalUpdated = 0;
          
          for (const departmentRow of departments) {
            const department = departmentRow.department_id;
            // const department = departmentRow
              
            for (const category of vehiclecategories) {
              console.log(`================================================================== Updating department ${category} : `, department);
              let endBalance = 0;
              let bringForward = 0;
              const invoicesQuery = `
                SELECT *
                FROM invoices_script
                WHERE is_cancelled = 0
                  AND department_id = ?
                  AND number LIKE ?
                  AND number NOT LIKE '%Blank%'
                  AND invoicing_method LIKE '%Department%'
                ORDER BY created_date ASC, id ASC
              `;

              const invoices = await query(connection, invoicesQuery, [
                department,
                `${category}%`,
              ]);

              for (const invoice of invoices) {

                const skipInvoiceList = [2927381]
                if (skipInvoiceList.includes(invoice.id)) {
                  bringForward = invoice.balance_as_at_end_date
                  continue; // Skip manually corrected payments
                }
                
                const startDate = moment(invoice.start_date).startOf('day').format('YYYY-MM-DD HH:mm:ss');
                const endDate = moment(invoice.end_date).endOf('day').format('YYYY-MM-DD HH:mm:ss');

                invoice.balance_as_at_start_date = bringForward;
                const paymentsQuery = `
                  SELECT COALESCE(
                    SUM(ri.paid + ri.certificate_paid),
                    0
                  ) AS total
                  FROM receipt_invoices ri
                  INNER JOIN invoices_script inv
                    ON inv.id = ri.invoice_id
                  INNER JOIN receipts r
                    ON r.id = ri.receipt_id
                  INNER JOIN payments p
                    ON p.id = r.payment_id
                  WHERE r.organization_id = ?
                    AND r.is_cancelled = 0
                    AND p.is_cancelled = 0
                    AND p.date BETWEEN ? AND ?
                    AND inv.number LIKE ?
                    AND inv.is_cancelled = 0
                    AND inv.department_id = ?
                `;

                const deductionsQuery = `
                  SELECT COALESCE(
                    SUM(bd.write_off_value),
                    0
                  ) AS total
                  FROM bad_debts bd
                  INNER JOIN invoices_script inv
                    ON inv.id = bd.invoice_id
                  WHERE bd.customer_code = ?
                    AND bd.is_write_off = 1
                    AND bd.write_off_date BETWEEN ? AND ?
                    AND inv.number LIKE ?
                    AND inv.is_cancelled = 0
                    AND inv.department_id = ?
                `;

                const [paymentRows, deductionRows] = await Promise.all([
                  query(connection, paymentsQuery, [
                    invoice.organization_id,
                    invoice.start_date,
                    invoice.end_date,
                    `${category}%`,
                    department,
                  ]),

                  query(connection, deductionsQuery, [
                    invoice.customer_code,
                    startDate,
                    endDate,
                    `${category}%`,
                    department,
                  ]),
                ]);

                let payments = Number(paymentRows[0]?.total || 0);
                let deductions = Number(deductionRows[0]?.total || 0);

                payments = Math.round(payments * 100) / 100;
                deductions = Math.round(deductions * 100) / 100;

                endBalance = invoice.balance_as_at_start_date + invoice.net_amount - payments - deductions;
                endBalance = Math.round(endBalance * 100) / 100;

                console.log(
                  `Invoice ${invoice.number}: startBalance = ${invoice.balance_as_at_start_date}, endBalance = ${endBalance}, Payments = ${payments}, Deductions = ${deductions}`
                );

                await query(
                  connection,
                  `
                    UPDATE invoices_script
                    SET payments = ?,
                        deductions = ?,
                        balance_as_at_start_date = ?,
                        balance_as_at_end_date = ?
                    WHERE id = ?
                  `,
                  [payments, deductions, bringForward, endBalance, invoice.id]
                );

                bringForward = endBalance;

                totalUpdated++;
              }
            }
          }

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

            return res.json({
              success: true,
              updated: totalUpdated,
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
      });
    });
  }
);

router.get("/update-payments-and-deductions-for-organizations",
  function (req, res) {
    const connection = mysql.createConnection(testDb);

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

        try {
          const organizationsQuery = `
            SELECT organization_id
            FROM invoices_script
            WHERE is_cancelled = 0
              AND invoicing_method = 'Organization'
              AND number NOT LIKE '%Blank%'
              AND department_id IS NULL
            GROUP BY organization_id
          `;

          const organizations = await query(connection, organizationsQuery);
          // const organizations = [300991];

          const vehiclecategories = ['V','K','B','C'];

          let totalUpdated = 0;
          
          for (const organizationRow of organizations) {
            const organization = organizationRow.organization_id;
            // const organization = organizationRow;
            
            for (const category of vehiclecategories) {
              console.log(`================================================================== Updating organization ${category} : `, organization);
              
              let endBalance = 0;
              let bringForward = 0;
              const invoicesQuery = `
                SELECT *
                FROM invoices_script
                WHERE is_cancelled = 0
                  AND organization_id = ?
                  AND number LIKE ?
                  AND number NOT LIKE '%Blank%'
                  AND invoicing_method = 'Organization'
                ORDER BY created_date ASC, id ASC
              `;

              const invoices = await query(connection, invoicesQuery, [
                organization,
                `${category}%`,
              ]);

              for (const invoice of invoices) {
                const startDate = moment(invoice.start_date).startOf('day').format('YYYY-MM-DD HH:mm:ss');
                const endDate = moment(invoice.end_date).endOf('day').format('YYYY-MM-DD HH:mm:ss');

                invoice.balance_as_at_start_date = bringForward;
                const paymentsQuery = `
                  SELECT COALESCE(
                    SUM(ri.paid + ri.certificate_paid),
                    0
                  ) AS total
                  FROM receipt_invoices ri
                  INNER JOIN invoices_script inv
                    ON inv.id = ri.invoice_id
                  INNER JOIN receipts r
                    ON r.id = ri.receipt_id
                  INNER JOIN payments p
                    ON p.id = r.payment_id
                  WHERE r.organization_id = ?
                    AND r.is_cancelled = 0
                    AND p.is_cancelled = 0
                    AND p.date BETWEEN ? AND ?
                    AND inv.number LIKE ?
                    AND inv.is_cancelled = 0
                    AND inv.department_id IS NULL
                `;

                const deductionsQuery = `
                  SELECT COALESCE(
                    SUM(bd.write_off_value),
                    0
                  ) AS total
                  FROM bad_debts bd
                  INNER JOIN invoices_script inv
                    ON inv.id = bd.invoice_id
                  WHERE bd.customer_code = ?
                    AND bd.is_write_off = 1
                    AND bd.write_off_date BETWEEN ? AND ?
                    AND inv.number LIKE ?
                    AND inv.is_cancelled = 0
                    AND inv.department_id IS NULL
                `;

                const [paymentRows, deductionRows] = await Promise.all([
                  query(connection, paymentsQuery, [
                    invoice.organization_id,
                    invoice.start_date,
                    invoice.end_date,
                    `${category}%`
                  ]),

                  query(connection, deductionsQuery, [
                    invoice.customer_code,
                    startDate,
                    endDate,
                    `${category}%`
                  ]),
                ]);

                let payments = Number(paymentRows[0]?.total || 0);
                let deductions = Number(deductionRows[0]?.total || 0);

                payments = Math.round(payments * 100) / 100;
                deductions = Math.round(deductions * 100) / 100;
                
                endBalance = invoice.balance_as_at_start_date + invoice.net_amount - payments - deductions;
                endBalance = Math.round(endBalance * 100) / 100;

                console.log(
                  `Invoice ${invoice.number}: start = ${invoice.balance_as_at_start_date}, end = ${endBalance}, Payments = ${payments}, Deductions = ${deductions}`
                );

                await query(
                  connection,
                  `
                    UPDATE invoices_script
                    SET payments = ?,
                        deductions = ?,
                        balance_as_at_start_date = ?,
                        balance_as_at_end_date = ?
                    WHERE id = ?
                  `,
                  [payments, deductions, bringForward, endBalance, invoice.id]
                );

                bringForward = endBalance;

                totalUpdated++;
              }
            }
          }

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

            return res.json({
              success: true,
              updated: totalUpdated,
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
      });
    });
  }
);

function query(connection, sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
      if (err) {
        return reject(err);
      }

      resolve(results);
    });
  });
}

export default router;
