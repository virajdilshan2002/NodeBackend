import express from "express";
import mysql from "mysql";
import async, { each, log } from "async";
import moment from "moment";
import Hashids from "hashids";

let hashids = new Hashids();

const router = express.Router();
let resultData;

const db = {
  host: "192.168.1.11",
  user: "kangaroo",
  password: "kan588",
  database: "1_corporate_master",
};
// const db = {
//   host: "localhost",
//   user: "root",
//   password: "Viraj@2002",
//   database: "1_corporate_test_copy",
// };
const connection1 = {
  host: "localhost",
  user: "root",
  password: "Viraj@2002",
  database: "voucher_org_copy",
};
const connection2 = {
  host: "localhost",
  user: "root",
  password: "Viraj@2002",
  database: "temp_copy",
};
// const connection2 = {
//   host: "192.168.1.11",
//   user: "kangaroo",
//   password: "kan588",
//   database: "c_corporate_prod_test",
// };

router.post("/add_voucher_book", function (req, res, next) {
  const connection = mysql.createConnection(db);
  let error = [];

  const refNo = req.body.ref_no;
  const category = req.body.category;
  const startRange = req.body.start_range;
  const endRange = req.body.end_range;
  const pagesCount = endRange - startRange + 1;
  const usedCount = req.body.used_count;
  const organizationId = req.body.organization_id;
  const departmentId = req.body.department_id;

  connection.connect(function (err2) {
    if (err2) {
      console.error("DB connection error:", err2);
      connection.end();
      return res.json({ error: err2 });
    }

    connection.query(
        "INSERT INTO voucher (ref_no, category, organization_id, department_id, start_page, end_page, no_of_pages, used_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [refNo, category, organizationId, departmentId, startRange, endRange, pagesCount, usedCount],
        function (err, orgs) {
          if (err) {
            console.error("DB query error:", err);
            connection.end();
            return res.json({ error: err });
          }
          connection.end();
          res.json({ message: "Voucher book added successfully" });
        }
      );
    })
});

router.post("/add_all_voucher_books", function (req, res, next) {
  const connection = mysql.createConnection(db);
  let error = [];

  const refNo = req.body.ref_no;
  const category = req.body.category;
  const organizationId = req.body.organization_id;
  const departmentId = req.body.department_id;
  const startRange = req.body.start_range;
  const endRange = req.body.end_range;
  const bookCount = req.body.book_count;

  const pagesPerBook = (endRange - (startRange - 1)) / bookCount;

  const books = [];
  for (let i = 0; i < bookCount; i++) {
    const bookStartPage = startRange + i * pagesPerBook;
    const bookEndPage = bookStartPage + pagesPerBook - 1;
    books.push({ 
      refNo: refNo, 
      category: category, 
      organizationId: organizationId, 
      departmentId: departmentId,
      startPage: bookStartPage, 
      endPage: bookEndPage,
      noOfPages: pagesPerBook 
    });
  }

  connection.connect(function (err2) {
    if (err2) {
      console.error("DB connection error:", err2);
      connection.end();
      return res.json({ error: err2 });
    }

    async.forEachOf(books, function (book, index, callback) {
      connection.query(
        "INSERT INTO voucher (ref_no, category, organization_id, department_id, start_page, end_page, no_of_pages) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [book.refNo, book.category, book.organizationId, book.departmentId, book.startPage, book.endPage, book.noOfPages],
        function (err, orgs) {
          if (err) {
            console.error("DB query error:", err);
            return callback(err);
          }
          callback();
        }
      );
    }, function (err) {
      if (err) {
        console.error("Error occurred while adding voucher books:", err);
        connection.end();
        return res.json({ error: err });
      }
      connection.end();
      res.json({ message: "Voucher book range added successfully" });
    });
  });
});

router.post("/delete_by_ref_no", function (req, res, next) {
  const connection = mysql.createConnection(db);
  let error = [];

  const refNo = req.body.ref_no;
  connection.connect(function (err2) {
    if (err2) {
      console.error("DB connection error:", err2);
      connection.end();
      return res.json({ error: err2 });
    }

    connection.query(
      "DELETE FROM voucher WHERE ref_no = ?",
      [refNo],
      function (err, result) {
        if (err) {
          console.error("DB query error:", err);
          connection.end();
          return res.json({ error: err });
        }
        connection.end();
        res.json({ message: "Voucher deleted successfully" });
      }
    );
  });
});

router.get("/create_voucher_organizations", function (req, res, next) {
  const connectionMain = mysql.createConnection(connection1);
  const connectionSecond = mysql.createConnection(connection2);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
      connectionMain.query(
        "SELECT * FROM organization o WHERE o.booking_type = 'Voucher'",
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
                    return res.json({ error: err2 });
                  }

                  connectionSecond.beginTransaction(function (transactionErr) {

                    if (transactionErr) {
                      connectionSecond.end();
                      return res.json({ error: transactionErr });
                    }

                    async.forEachSeries(
                      json,
                      function (returnObj, next) {
                        const vehicleRates = returnObj.vehicle_rates
                          ? JSON.parse(returnObj.vehicle_rates)
                          : [];

                        let budget = null;
                        let city = null;
                        let car = null;
                        let van = null;

                        for (const rate of vehicleRates) {
                          if (rate.type == "Budget") {
                            budget = rate;
                          }
                          if (rate.type == "City") {
                            city = rate;
                          }
                          if (rate.type == "Car") {
                            car = rate;
                          }
                          if (rate.type == "Van") {
                            van = rate;
                          }
                        }

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
                            update_at_date, monthly_check_date, nbt_no, insert_date, marketing_personnel_id, invoicing_generate_type, sp_rates, vehicle_rates, is_voucher_booking_allowed, admin_email, first_name,
                            last_name, land_number, mobile_number, budget_invoicing_generate_type, city_invoicing_generate_type, car_invoicing_generate_type, van_invoicing_generate_type, nic, passport_no
                          ) VALUES (${Array(71).fill("?").join(", ")});
                        `;

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
                          returnObj.is_non_agreement_categories?.data?.[0] ?? null,
                          returnObj.is_non_agreement_categories_allowed?.data?.[0] ?? null,
                          returnObj.invoicing_method,
                          returnObj.credit_limit_balance,
                          returnObj.running_balance,
                          returnObj.is_approval_required_for_booking?.data?.[0] ?? false,
                          returnObj.is_disabled?.data?.[0] ?? false,
                          returnObj.is_category_discount_allowed?.data?.[0] ?? false,
                          returnObj.overall_discount_limit,
                          returnObj.overall_discount_rate,
                          returnObj.overall_discount_type,
                          returnObj.approved_booking_categories,
                          returnObj.is_credit_limit_active?.data?.[0] ?? false,
                          returnObj.overall_discount_lower_limit_rate,
                          returnObj.booking_type,
                          returnObj.old_customer_code,
                          returnObj.is_call_center_order_allowed?.data?.[0] ?? false,
                          returnObj.organization_category,
                          returnObj.is_check_monthly_usage?.data?.[0] ?? false,
                          returnObj.create_at_date,
                          returnObj.update_at_date,
                          returnObj.monthly_check_date,
                          returnObj.nbt_no,
                          returnObj.insert_date,
                          returnObj.marketing_personnel_id,
                          returnObj.invoicing_generate_type,
                          returnObj.sp_rates,
                          returnObj.vehicle_rates ?? null,
                          returnObj.is_voucher_booking_allowed?.data?.[0] ?? true,
                          returnObj.admin_email,
                          returnObj.first_name,
                          returnObj.last_name,
                          returnObj.land_number,
                          returnObj.mobile_number,
                          budget?.invoicing_type ?? null,
                          city?.invoicing_type ?? null,
                          car?.invoicing_type ?? null,
                          van?.invoicing_type ?? null,
                          returnObj.nic ?? null,
                          returnObj.passport_no ?? null,
                        ];

                        connectionSecond.query(
                          sql,
                          values,
                          function (err, result) {
                            if (err) {
                              console.error("Error inserting organization:", err);
                              return next(err);
                            }
                            if (returnObj.booking_type === "Corporate") {
                              return next();
                            }

                            const depSql = `
                              INSERT INTO department (
                                approved_categories, credit_limit, join_request_token, name, payment_token, is_deleted,
                                running_balance, is_approval_required_for_booking, email, organization_id, contact_personnels_id
                              ) VALUES (${Array(11).fill("?").join(", ")});
                            `;

                            const depValues = [
                              null,
                              0.0,
                              null,
                              returnObj.customer_code,
                              null,
                              false,
                              0.0,
                              false,
                              null,
                              returnObj.id,
                              null,
                            ];

                            connectionSecond.query(
                              depSql,
                              depValues,
                              function (err, depResult) {

                                if (err) {
                                  console.error("Error inserting department:", err);
                                  return next(err);
                                }

                                const paymentToken = `d-${hashids.encode(depResult.insertId)}`;

                                const joinRequestToken =
                                  (returnObj.name || "").substring(0, 4) +
                                  (returnObj.customer_code || "").substring(0, 2) +
                                  hashids.encode(depResult.insertId);

                                connectionSecond.query(
                                  "UPDATE department SET payment_token = ?, join_request_token = ? WHERE id = ?",
                                  [paymentToken, joinRequestToken, depResult.insertId],
                                  function (err) {
                                    if (err) {
                                      console.error("Error updating department:", err);
                                      return next(err);
                                    }

                                    const sql = `INSERT INTO user (
                contact_number, email, password, user_type, username, external_jwt_token, is_created, random_password, created_by_user,
                is_deleted, auth_admins, auth_all_bookings, auth_approve_booking, auth_department, is_booking_available, is_email_available, is_invoice_available,
                is_join_request_available, is_message_available, auth_users, organization_id, department_id 
                ) VALUES (${Array(22).fill("?").join(", ")}); `;

                                    const randomPassword = generateRandomPassword(); 

                                    const values = [
                                      returnObj.contact_no,
                                      returnObj.email,
                                      null,
                                      'Admin',
                                      returnObj.customer_code,
                                      null,
                                      false,
                                      randomPassword,
                                      0,
                                      false,
                                      'add,edit,view,delete', // auth admins
                                      'view,cancel',  // auth all bookings
                                      'approve,reject', // auth approve booking
                                      'add,edit,view,delete', // auth departments
                                      true,
                                      true,
                                      true,
                                      true,
                                      true,
                                      'add,edit,view,delete', // auth users
                                      returnObj.id,
                                      null,
                                    ];

                                    connectionSecond.query(
                                      sql,
                                      values,
                                      function (err, userResult) {
                                        if (err) {
                                          console.error("Error inserting user:", err);
                                          return next(err);
                                        }

                                        next();
                                      }
                                    );
                                  }
                                );
                              }
                            );
                          }
                        );
                      },

                      function (err) {

                        if (err) {

                          return connectionSecond.rollback(function () {

                            console.error("ROLLBACK:", err);

                            connectionSecond.end();

                            res.json({
                              success: false,
                              error: err,
                            });
                          });
                        }

                        connectionSecond.commit(function (commitErr) {

                          if (commitErr) {

                            return connectionSecond.rollback(function () {

                              console.error("COMMIT ERROR:", commitErr);

                              connectionSecond.end();

                              res.json({
                                success: false,
                                error: commitErr,
                              });
                            });
                          }

                          connectionSecond.end();

                          res.json({
                            success: true,
                            message: "All organizations inserted successfully",
                          });
                        });
                      }
                    );
                  });

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

function generateRandomPassword(length = 10) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('');
}
export default router;