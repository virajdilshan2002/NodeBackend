import express from "express";
import mysql from "mysql";

const router = express.Router();

const productDB = {
  host: "192.168.1.10",
  user: "usr_local",
  password: "lobos681",
  database: "corporate_master",
};

router.get("/missing-dep-vou-organizations", function (req, res, next) {
  const connection = mysql.createConnection(productDB);
  let error = [];
  let resultData = [];

  connection.connect(function (err2) {
    if (err2) {
      console.error("DB connection error:", err2);
      connection.end();
      return res.json({ error: err2 });
    }

    connection.query("SELECT o.customer_code FROM organization o WHERE booking_type = 'Voucher'",
        async function (err, orgs) {
            if (err) {
            connection.end();
            return res.json({ error: err });
            }

            const promises = orgs.map(
            org =>
                new Promise(resolve => {
                connection.query(
                    "SELECT d.id, d.name FROM department d WHERE d.name = ?",
                    [org.customer_code],
                    (err, deps) => {
                    if (err) {
                        error.push({
                        organization: org.customer_code,
                        error: err.message,
                        });
                    } else if (deps.length === 0) {
                        error.push({
                        organization: org.customer_code,
                        error: "No departments found",
                        });
                    } else if (deps.length > 1) {
                        error.push({
                        organization: org.customer_code,
                        error: "Multiple departments found",
                        });
                    } else {
                        resultData.push({
                        organization: org.customer_code,
                        department: deps[0].name,
                        });
                    }

                    resolve();
                    }
                );
                })
            );

            await Promise.all(promises);

            connection.end();

            return res.json({
            result: resultData,
            errors: error,
            });
        }
        );
    })
});

router.get("/missing-dep-cop-organizations", function (req, res, next) {
  const connection = mysql.createConnection(productDB);
  let error = [];
  let foundList = [];
  let missingList = [];

  connection.connect(function (err2) {
    if (err2) {
      console.error("DB connection error:", err2);
      connection.end();
      return res.json({ error: err2 });
    }

    connection.query("SELECT o.customer_code, o.invoicing_method FROM organization o WHERE booking_type = 'Corporate' AND is_voucher_booking_allowed = 1",
        async function (err, orgs) {
            if (err) {
            connection.end();
            return res.json({ error: err });
            }

            const promises = orgs.map(
            org =>
                new Promise(resolve => {
                connection.query(
                    "SELECT d.id, d.name FROM department d WHERE d.name = ?",
                    [org.customer_code],
                    (err, deps) => {
                    if (err) {
                        error.push({
                        organization: org.customer_code,
                        error: err.message,
                        });
                    } else if (deps.length === 0) {
                        missingList.push(`${org.customer_code} ${org.invoicing_method}`)
                    } else if (deps.length > 1) {
                        error.push({
                        organization: org.customer_code,
                        error: "Multiple departments found",
                        });
                    } else {
                        foundList.push({
                        organization: org.customer_code,
                        department: deps[0].name,
                        });
                    }

                    resolve();
                    }
                );
                })
            );

            await Promise.all(promises);

            connection.end();

            return res.json({
            result: foundList,
            errors: error,
            missingList: missingList
            });
        }
        );
    })
});

router.get("/invoiced-vou-orgs", function (req, res, next) {
  const connection = mysql.createConnection(productDB);
  let error = [];
  let InvoicedOrgs = [];
  let notInvoicedOrgs = [];

  connection.connect(function (err2) {
    if (err2) {
      console.error("DB connection error:", err2);
      connection.end();
      return res.json({ error: err2 });
    }

    connection.query("SELECT o.id, o.customer_code, o.booking_type, o.invoicing_method FROM organization o WHERE o.is_voucher_booking_allowed = 1",
        async function (err, orgs) {
            if (err) {
            connection.end();
            return res.json({ error: err });
            }

            const promises = orgs.map(
            org =>
                new Promise(resolve => {
                connection.query(
                    "SELECT i.id, i.number FROM invoices i WHERE i.organization_id = ?",
                    [org.id],
                    (err, invoices) => {
                        console.log(invoices.length);
                    if (err) {
                        error.push({
                        organization: org.id,
                        error: err.message,
                        });
                    } else if (invoices.length === 0) {
                        notInvoicedOrgs.push(`${org.customer_code} | ${org.booking_type} | ${org.invoicing_method} | invoice count: ${invoices.length}`)
                    } else if (invoices.length > 0) {
                        InvoicedOrgs.push(`${org.customer_code} | ${org.booking_type} | ${org.invoicing_method} | invoice count: ${invoices.length}`)
                    } else {
                        error.push({
                        organization: org.id,
                        error: "Unexpected result",
                        });
                    }
                    resolve();
                    }
                );
                })
            );

            await Promise.all(promises);

            connection.end();

            return res.json({
                notInvoicedOrgs: notInvoicedOrgs,
                InvoicedOrgs: InvoicedOrgs,
                errors: error,
            });
        }
        );
    })
});

router.get("/duplicate_vou_companies", async function (req, res) {
  const connection = mysql.createConnection(productDB);

  connection.connect(async function (err) {
    if (err) {
      console.error(err);
      return res.json({ error: err });
    }

    try {
      const promises = dupList.map(
        (item) =>
          new Promise((resolve, reject) => {
            connection.query(
              `SELECT o.name
               FROM voucher v
               LEFT JOIN organization o ON v.organization_id = o.id
               WHERE v.category = ? AND v.start_page = ?
               GROUP BY o.name`,
              [item.cat, item.s_page],
              (err, orgs) => {
                if (err) {
                  return reject(err);
                }

                resolve({
                  category: item.cat,
                  startPage: item.s_page,
                  organizations: orgs,
                  
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


router.get("/missing-vou-records", async function (req, res) {
  const connection = mysql.createConnection(productDB);

  connection.connect(async function (err) {
    if (err) {
      console.error(err);
      return res.json({ error: err });
    }

    try {
        connection.query(`SELECT b.bill_number FROM booking b WHERE b.bill_number IS NOT NULL AND is_token_voucher = 0`, (err, bookings) => {
            if (err) {
                connection.end();
                return res.json({ error: err });
            }

            const promises = bookings.map(
                (book) =>
                new Promise((resolve, reject) => {
                    connection.query(
                    `SELECT *
                    FROM voucher_list v WHERE v.bill_number = ?`,
                    [book.bill_number],
                    (err, orgs) => {
                        if (err) {
                        return reject(err);
                        }

                        if (orgs.length === 0) {
                            resolve({
                                bill_number: book.bill_number,
                                missing: true
                            });
                        }
                    }
                    );
                })
            );

            const resultData = Promise.all(promises);

            connection.end();

            return res.json(resultData);
        })
    } catch (err) {
      connection.end();
      return res.status(500).json({ error: err });
    }
  });
});


let dupList = [{'cat': 'A', 's_page': 1},
 {'cat': 'D', 's_page': 435901},
 {'cat': 'D', 's_page': 436051},
 {'cat': 'D', 's_page': 951126},
 {'cat': 'B', 's_page': 526576},
 {'cat': 'B', 's_page': 526601},
 {'cat': 'B', 's_page': 526626},
 {'cat': 'B', 's_page': 526651},
 {'cat': 'B', 's_page': 526676},
 {'cat': 'B', 's_page': 531976},
 {'cat': 'B', 's_page': 532001},
 {'cat': 'B', 's_page': 532026},
 {'cat': 'B', 's_page': 532051},
 {'cat': 'B', 's_page': 532076},
 {'cat': 'B', 's_page': 538576},
 {'cat': 'B', 's_page': 538601},
 {'cat': 'B', 's_page': 546951},
 {'cat': 'B', 's_page': 558801},
 {'cat': 'B', 's_page': 558826},
 {'cat': 'B', 's_page': 558851},
 {'cat': 'B', 's_page': 558876},
 {'cat': 'B', 's_page': 558901},
 {'cat': 'D', 's_page': 8051},
 {'cat': 'D', 's_page': 8076},
 {'cat': 'D', 's_page': 9126},
 {'cat': 'D', 's_page': 9726},
 {'cat': 'D', 's_page': 9826},
 {'cat': 'D', 's_page': 9876},
 {'cat': 'D', 's_page': 9901},
 {'cat': 'D', 's_page': 11426},
 {'cat': 'D', 's_page': 12526},
 {'cat': 'D', 's_page': 12576},
 {'cat': 'D', 's_page': 13151},
 {'cat': 'D', 's_page': 16051},
 {'cat': 'D', 's_page': 38451},
 {'cat': 'D', 's_page': 38551},
 {'cat': 'D', 's_page': 43626},
 {'cat': 'D', 's_page': 43651},
 {'cat': 'D', 's_page': 51326},
 {'cat': 'D', 's_page': 60576},
 {'cat': 'D', 's_page': 60601},
 {'cat': 'D', 's_page': 81101},
 {'cat': 'D', 's_page': 81126},
 {'cat': 'D', 's_page': 101676},
 {'cat': 'D', 's_page': 129801},
 {'cat': 'D', 's_page': 143251},
 {'cat': 'D', 's_page': 143626},
 {'cat': 'D', 's_page': 143651},
 {'cat': 'D', 's_page': 153426},
 {'cat': 'D', 's_page': 205526},
 {'cat': 'D', 's_page': 208251},
 {'cat': 'D', 's_page': 213751},
 {'cat': 'D', 's_page': 213776},
 {'cat': 'D', 's_page': 236376},
 {'cat': 'D', 's_page': 254301},
 {'cat': 'D', 's_page': 275126},
 {'cat': 'D', 's_page': 275351},
 {'cat': 'D', 's_page': 276176},
 {'cat': 'D', 's_page': 284951},
 {'cat': 'D', 's_page': 284976},
 {'cat': 'D', 's_page': 296826},
 {'cat': 'D', 's_page': 316076},
 {'cat': 'D', 's_page': 317101},
 {'cat': 'D', 's_page': 340601},
 {'cat': 'D', 's_page': 367276},
 {'cat': 'D', 's_page': 367301},
 {'cat': 'D', 's_page': 367326},
 {'cat': 'D', 's_page': 367351},
 {'cat': 'D', 's_page': 367376},
 {'cat': 'D', 's_page': 435926},
 {'cat': 'D', 's_page': 435951},
 {'cat': 'D', 's_page': 435976},
 {'cat': 'D', 's_page': 436001},
 {'cat': 'D', 's_page': 469326},
 {'cat': 'D', 's_page': 508026},
 {'cat': 'D', 's_page': 508051},
 {'cat': 'D', 's_page': 508076},
 {'cat': 'D', 's_page': 508101},
 {'cat': 'D', 's_page': 519126},
 {'cat': 'D', 's_page': 562551},
 {'cat': 'D', 's_page': 562576},
 {'cat': 'D', 's_page': 562601},
 {'cat': 'D', 's_page': 562626},
 {'cat': 'D', 's_page': 562651},
 {'cat': 'D', 's_page': 562676},
 {'cat': 'D', 's_page': 562701},
 {'cat': 'D', 's_page': 562726},
 {'cat': 'D', 's_page': 562751},
 {'cat': 'D', 's_page': 562776},
 {'cat': 'D', 's_page': 573151},
 {'cat': 'D', 's_page': 573176},
 {'cat': 'D', 's_page': 592801},
 {'cat': 'D', 's_page': 592826},
 {'cat': 'D', 's_page': 599651},
 {'cat': 'D', 's_page': 599676},
 {'cat': 'D', 's_page': 615551},
 {'cat': 'd', 's_page': 643526},
 {'cat': 'D', 's_page': 652426},
 {'cat': 'D', 's_page': 653201},
 {'cat': 'D', 's_page': 691376},
 {'cat': 'D', 's_page': 691476},
 {'cat': 'D', 's_page': 699201},
 {'cat': 'D', 's_page': 734601},
 {'cat': 'D', 's_page': 734626},
 {'cat': 'D', 's_page': 734726},
 {'cat': 'D', 's_page': 734751},
 {'cat': 'D', 's_page': 739226},
 {'cat': 'D', 's_page': 745451},
 {'cat': 'D', 's_page': 745476},
 {'cat': 'D', 's_page': 745501},
 {'cat': 'D', 's_page': 745526},
 {'cat': 'D', 's_page': 745551},
 {'cat': 'D', 's_page': 745651},
 {'cat': 'D', 's_page': 751101},
 {'cat': 'D', 's_page': 763001},
 {'cat': 'D', 's_page': 763026},
 {'cat': 'D', 's_page': 789126},
 {'cat': 'D', 's_page': 794226},
 {'cat': 'D', 's_page': 799451},
 {'cat': 'D', 's_page': 799476},
 {'cat': 'D', 's_page': 826276},
 {'cat': 'D', 's_page': 827676},
 {'cat': 'D', 's_page': 827701},
 {'cat': 'D', 's_page': 827726},
 {'cat': 'D', 's_page': 836076},
 {'cat': 'D', 's_page': 841001},
 {'cat': 'D', 's_page': 844451},
 {'cat': 'D', 's_page': 866151},
 {'cat': 'D', 's_page': 869251},
 {'cat': 'D', 's_page': 877026},
 {'cat': 'D', 's_page': 877051},
 {'cat': 'D', 's_page': 879951},
 {'cat': 'D', 's_page': 882376},
 {'cat': 'D', 's_page': 882401},
 {'cat': 'D', 's_page': 882426},
 {'cat': 'D', 's_page': 938726},
 {'cat': 'D', 's_page': 938751},
 {'cat': 'D', 's_page': 938776},
 {'cat': 'D', 's_page': 938801},
 {'cat': 'D', 's_page': 938826},
 {'cat': 'D', 's_page': 942526},
 {'cat': 'D', 's_page': 942551},
 {'cat': 'D', 's_page': 970501},
 {'cat': 'E', 's_page': 1},
 {'cat': 'E', 's_page': 26},
 {'cat': 'E', 's_page': 51},
 {'cat': 'E', 's_page': 76},
 {'cat': 'E', 's_page': 101},
 {'cat': 'E', 's_page': 126},
 {'cat': 'E', 's_page': 151},
 {'cat': 'E', 's_page': 176},
 {'cat': 'E', 's_page': 201},
 {'cat': 'E', 's_page': 226},
 {'cat': 'F', 's_page': 32251},
 {'cat': 'G', 's_page': 6126},
 {'cat': 'G', 's_page': 6151},
 {'cat': 'G', 's_page': 6176},
 {'cat': 'G', 's_page': 6201},
 {'cat': 'G', 's_page': 6601},
 {'cat': 'G', 's_page': 27126},
 {'cat': 'G', 's_page': 34926},
 {'cat': 'G', 's_page': 38676},
 {'cat': 'G', 's_page': 38826},
 {'cat': 'G', 's_page': 68601},
 {'cat': 'G', 's_page': 68626},
 {'cat': 'G', 's_page': 70001},
 {'cat': 'G', 's_page': 80101},
 {'cat': 'G', 's_page': 109301},
 {'cat': 'G', 's_page': 109326},
 {'cat': 'G', 's_page': 149101},
 {'cat': 'G', 's_page': 149126},
 {'cat': 'G', 's_page': 155726},
 {'cat': 'G', 's_page': 165651},
 {'cat': 'G', 's_page': 165776},
 {'cat': 'G', 's_page': 165801},
 {'cat': 'G', 's_page': 188026},
 {'cat': 'G', 's_page': 220626},
 {'cat': 'G', 's_page': 313676},
 {'cat': 'G', 's_page': 335126},
 {'cat': 'G', 's_page': 344551},
 {'cat': 'G', 's_page': 391051},
 {'cat': 'G', 's_page': 434351},
 {'cat': 'G', 's_page': 487001},
 {'cat': 'G', 's_page': 487026},
 {'cat': 'G', 's_page': 487051},
 {'cat': 'G', 's_page': 487076},
 {'cat': 'G', 's_page': 487101},
 {'cat': 'G', 's_page': 487126},
 {'cat': 'G', 's_page': 487151},
 {'cat': 'G', 's_page': 487176},
 {'cat': 'G', 's_page': 487201},
 {'cat': 'G', 's_page': 487226},
 {'cat': 'G', 's_page': 487251},
 {'cat': 'G', 's_page': 487276},
 {'cat': 'G', 's_page': 487301},
 {'cat': 'G', 's_page': 487326},
 {'cat': 'G', 's_page': 487351},
 {'cat': 'G', 's_page': 487501},
 {'cat': 'G', 's_page': 487526},
 {'cat': 'H', 's_page': 4926},
 {'cat': 'H', 's_page': 4951},
 {'cat': 'H', 's_page': 11426},
 {'cat': 'H', 's_page': 24001},
 {'cat': 'H', 's_page': 25076},
 {'cat': 'H', 's_page': 25201},
 {'cat': 'H', 's_page': 25226},
 {'cat': 'H', 's_page': 26351},
 {'cat': 'H', 's_page': 38651},
 {'cat': 'H', 's_page': 38751},
 {'cat': 'H', 's_page': 38826},
 {'cat': 'H', 's_page': 40001},
 {'cat': 'H', 's_page': 40026},
 {'cat': 'H', 's_page': 40126},
 {'cat': 'H', 's_page': 40151},
 {'cat': 'H', 's_page': 41976},
 {'cat': 'H', 's_page': 42201},
 {'cat': 'H', 's_page': 42401},
 {'cat': 'H', 's_page': 45501},
 {'cat': 'H', 's_page': 47726},
 {'cat': 'H', 's_page': 47901},
 {'cat': 'H', 's_page': 48101},
 {'cat': 'H', 's_page': 49976},
 {'cat': 'H', 's_page': 54226},
 {'cat': 'H', 's_page': 55001},
 {'cat': 'H', 's_page': 55101},
 {'cat': 'H', 's_page': 57051},
 {'cat': 'H', 's_page': 57076},
 {'cat': 'H', 's_page': 62401},
 {'cat': 'H', 's_page': 76126},
 {'cat': 'H', 's_page': 77101},
 {'cat': 'H', 's_page': 80026},
 {'cat': 'h', 's_page': 80076},
 {'cat': 'H', 's_page': 80101},
 {'cat': 'H', 's_page': 80126},
 {'cat': 'H', 's_page': 81226},
 {'cat': 'H', 's_page': 84576},
 {'cat': 'H', 's_page': 84601},
 {'cat': 'H', 's_page': 84626},
 {'cat': 'H', 's_page': 84651},
 {'cat': 'H', 's_page': 84676},
 {'cat': 'H', 's_page': 89851}]

const dupList2 = [
    {
        "category": "B",
        "startPage": 538576,
        "organizations": [
            {
                "name": "V-OtherCompany"
            },
            {
                "name": "V-PortCity"
            }
        ]
    },
    {
        "category": "B",
        "startPage": 538601,
        "organizations": [
            {
                "name": "V-OtherCompany"
            },
            {
                "name": "V-PortCity"
            }
        ]
    },
    {
        "category": "B",
        "startPage": 546951,
        "organizations": [
            {
                "name": "SamsungIndiaElectronicsPvtLtd"
            },
            {
                "name": "V-OtherCompany"
            }
        ]
    },
    {
        "category": "B",
        "startPage": 558801,
        "organizations": [
            {
                "name": "V-CitySchoolofArchitecture"
            }
        ]
    },
    {
        "category": "B",
        "startPage": 558826,
        "organizations": [
            {
                "name": "V-CitySchoolofArchitecture"
            }
        ]
    },
    {
        "category": "B",
        "startPage": 558851,
        "organizations": [
            {
                "name": "V-CitySchoolofArchitecture"
            }
        ]
    },
    {
        "category": "B",
        "startPage": 558876,
        "organizations": [
            {
                "name": "V-CitySchoolofArchitecture"
            }
        ]
    },
    {
        "category": "B",
        "startPage": 558901,
        "organizations": [
            {
                "name": "V-CitySchoolofArchitecture"
            }
        ]
    },
    
    {
        "category": "G",
        "startPage": 335126,
        "organizations": [
            {
                "name": "TheInstitutionofEngineersSrilanka"
            },
            {
                "name": "V-OtherCompany"
            }
        ]
    },
    
    {
        "category": "G",
        "startPage": 487001,
        "organizations": [
            {
                "name": "V-StThomesCollege"
            }
        ]
    },
    {
        "category": "G",
        "startPage": 487026,
        "organizations": [
            {
                "name": "V-StThomesCollege"
            }
        ]
    },
    {
        "category": "G",
        "startPage": 487051,
        "organizations": [
            {
                "name": "V-StThomesCollege"
            }
        ]
    },
    {
        "category": "G",
        "startPage": 487076,
        "organizations": [
            {
                "name": "V-StThomesCollege"
            }
        ]
    },
    {
        "category": "G",
        "startPage": 487101,
        "organizations": [
            {
                "name": "V-StThomesCollege"
            }
        ]
    },
    {
        "category": "G",
        "startPage": 487126,
        "organizations": [
            {
                "name": "FairfirstInsuranceLimited"
            }
        ]
    },
    {
        "category": "G",
        "startPage": 487151,
        "organizations": [
            {
                "name": "FairfirstInsuranceLimited"
            }
        ]
    },
    {
        "category": "G",
        "startPage": 487176,
        "organizations": [
            {
                "name": "FairfirstInsuranceLimited"
            }
        ]
    },
    {
        "category": "G",
        "startPage": 487201,
        "organizations": [
            {
                "name": "FairfirstInsuranceLimited"
            }
        ]
    },
    {
        "category": "G",
        "startPage": 487226,
        "organizations": [
            {
                "name": "FairfirstInsuranceLimited"
            }
        ]
    },
    {
        "category": "G",
        "startPage": 487251,
        "organizations": [
            {
                "name": "FairfirstInsuranceLimited"
            }
        ]
    },
    {
        "category": "G",
        "startPage": 487276,
        "organizations": [
            {
                "name": "FairfirstInsuranceLimited"
            }
        ]
    },
    {
        "category": "G",
        "startPage": 487301,
        "organizations": [
            {
                "name": "FairfirstInsuranceLimited"
            }
        ]
    },
    {
        "category": "G",
        "startPage": 487326,
        "organizations": [
            {
                "name": "FairfirstInsuranceLimited"
            }
        ]
    },
    {
        "category": "G",
        "startPage": 487351,
        "organizations": [
            {
                "name": "FairfirstInsuranceLimited"
            }
        ]
    },
    {
        "category": "G",
        "startPage": 487501,
        "organizations": [
            {
                "name": "V-NationalOlympicCommitteeofSriLanka"
            }
        ]
    },
    {
        "category": "G",
        "startPage": 487526,
        "organizations": [
            {
                "name": "V-NationalOlympicCommitteeofSriLanka"
            }
        ]
    },
    
    {
        "category": "H",
        "startPage": 84576,
        "organizations": [
            {
                "name": "V-OtherCompany"
            },
            {
                "name": "V-SACEP"
            }
        ]
    },
    {
        "category": "H",
        "startPage": 84601,
        "organizations": [
            {
                "name": "V-OtherCompany"
            },
            {
                "name": "V-SACEP"
            }
        ]
    },
    {
        "category": "H",
        "startPage": 84626,
        "organizations": [
            {
                "name": "V-OtherCompany"
            },
            {
                "name": "V-SACEP"
            }
        ]
    },
    {
        "category": "H",
        "startPage": 84651,
        "organizations": [
            {
                "name": "V-OtherCompany"
            },
            {
                "name": "V-SACEP"
            }
        ]
    },
    {
        "category": "H",
        "startPage": 84676,
        "organizations": [
            {
                "name": "V-OtherCompany"
            },
            {
                "name": "V-SACEP"
            }
        ]
    }
]

export default router;