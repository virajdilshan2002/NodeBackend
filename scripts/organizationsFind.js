import express from "express";
import mysql from "mysql";
import async from "async";
import moment from "moment";

const router = express.Router();

const db = {
  host: "192.168.1.11",
  user: "kangaroo",
  password: "kan588",
  database: "1_corporate_test_copy",
};

const givenCompanies = [
  { name: "BOC Travels", category: "F" },
  { name: "Bodyline B028", category: "M" },
  { name: "Colma", category: "F" },
  { name: "British Broadcasting", category: "M" },
  { name: "Experties", category: "F" },
  { name: "Citrus Silver", category: "M" },
  { name: "Fire X", category: "F" },
  { name: "Dialog", category: "M" },
  { name: "H connect (Chech Each & evry Hire)", category: "F" },
  { name: "Dialog WTC", category: "M" },
  { name: "John morris", category: "F" },
  { name: "Eiger Holdings", category: "M" },
  { name: "Landster", category: "F" },
  { name: "Flora Food", category: "M" },
  { name: "Medisans Sans", category: "F" },
  { name: "Future Fibes", category: "M" },
  { name: "Mobitel", category: "F" },
  { name: "Galle Face", category: "M" },
  { name: "National Credit (Chech Each & evry Hire)", category: "F" },
  { name: "GTN Networks", category: "M" },
  { name: "National Savings Bank (Chech Each & evry Hire)", category: "F" },
  { name: "Helman MAS", category: "M" },
  { name: "Robert Bosch (Chech Each & evry Hire)", category: "F" },
  { name: "HSBC", category: "M" },
  { name: "Christ Lanka", category: "F" },
  { name: "Healthrecon", category: "M" },
  { name: "Corellex", category: "F" },
  { name: "ISA", category: "M" },
  { name: "I 2 ENT", category: "F" },
  { name: "MAS Innovation", category: "M" },
  { name: "Meigomei", category: "F" },
  { name: "Millemium IT", category: "M" },
  { name: "SL Ins of Biotechlogy", category: "F" },
  { name: "Muve Colombo", category: "M" },
  { name: "North Manufacturing", category: "F" },
  { name: "Seylan Bank", category: "M" },
  { name: "Musaeus Collage", category: "F" },
  { name: "Seylan Bank RED", category: "M" },
  { name: "Nation Orthocare", category: "F" },
  { name: "Singer", category: "M" },
  { name: "Lalan Fabrics", category: "F" },
  { name: "Sysco Labs Staff", category: "M" },
  { name: "Mireka Seascape", category: "F" },
  { name: "Union Bank", category: "M" },
  { name: "Vitahub", category: "F" },
  { name: "Waterfront", category: "M" },
  { name: "Janashakthi Insurance", category: "F" },
  { name: "Sri Lanka Cert", category: "M" },
  { name: "Port City BPO", category: "F" },
  { name: "Huawei", category: "M" },
  { name: "JAT holding", category: "F" },
  { name: "BCD Travels", category: "F" },
  { name: "Watercare", category: "F" }
];

const companies = [
  { name: "BOC Travels (Private) Limited.", category: "F" },
  { name: "Bodyline (Private) Limited.", category: "M" },
  { name: "COLMA (Private) Limited.", category: "F" },
  { name: "British Broadcasting Corporation", category: "M" },
  { name: "Expertise France", category: "F" },
  { name: "Citrus Silver Ltd. ", category: "M" },
  { name: "Fire X Project (Private) Limited", category: "F" },
  { name: "Dialog Axiata PLC.", category: "M" },
  { name: "H Connect International (Pvt) Ltd", category: "F" },
  { name: "Dialog Axiata PLC. WTC Branch", category: "M" },
  { name: "John Morris Group (Pvt) Ltd", category: "F" },
  { name: "Eiger Holdings (PVT) Ltd", category: "M" },
  { name: "Landster Lanka (Pvt) Ltd.", category: "F" },
  { name: "Flora Food Management Lanka (Pvt) Ltd", category: "M" },
  { name: "Medecins Sans Frontiers (MSF) South Asia (Guarantee) Limited", category: "F" },
  { name: "Future Fibres Lanka (PVT) Ltd", category: "M" },
  { name: "Mobitel (PVT) Ltd", category: "F" },
  { name: "Galle Face Hotel - 1994 (Pvt) Ltd", category: "M" },
  { name: "National Credit Guarantee Institution Limited. (NCGIL)", category: "F" },
  { name: "GTN Technologies (Pvt) Ltd", category: "M" },
  { name: "National Savings Bank", category: "F" },
  { name: "Hellmann MAS Supply Chain (Private) Limited.", category: "M" },
  { name: "Robert Bosch Lanka (Pvt)  Ltd", category: "F" },
  { name: "HSBC Business Runs", category: "M" },
  { name: "Christic Lanka Polymers (Pvt) Ltd", category: "F" },
  { name: "Healthrecon Connect (PVT) Ltd", category: "M" },
  { name: "Corellex", category: "F" },
  { name: "ISA", category: "M" },
  { name: "I 2 E.N.T Consultancy (PVT) Ltd", category: "F" },
  { name: "MAS Innovation (Private) Limited.", category: "M" },
  { name: "Meigaomei Sales (PVT) Ltd", category: "F" },
  { name: "Millenium I.T.E.S.P (Pvt) Ltd", category: "M" },
  { name: "Sri Lanka Institute of Biotechnology (Pvt) Ltd", category: "F" },
  { name: "Muve Colombo (PVT) Ltd", category: "M" },
  { name: "North Manufacturing (Pvt) Ltd.", category: "F" },
  { name: "Seylan Bank PLC", category: "M" },
  { name: "Musaeus College", category: "F" },
  { name: "Seylan RED High Net worth Banking Unit 2", category: "M" },
  { name: "Nation Orthocare (Pvt) Ltd.", category: "F" },
  { name: "Singer (Sri Lanka) PLC", category: "M" },
  { name: "Lalan Fabrics (Private) Limited.", category: "F" },
  { name: "Sysco Labs Technologies (Pvt) Ltd - (Staff Transport)", category: "M" },
  { name: "Mireka Seascape (Private) Limited.", category: "F" },
  { name: "Union Bank Colombo Plc", category: "M" },
  { name: "VITALHUB (PVT) LTD.", category: "F" },
  { name: "Waterfront Properties (Pvt) Ltd", category: "M" },
  { name: "Janashakthi Insurance PLC", category: "F" },
  { name: "Sri Lanka Cert (Pvt) Ltd", category: "M" },
  { name: "Port City BPO (Pvt) Ltd", category: "F" },
  { name: "Huawei Technologies Lanka co. (Pvt) Ltd", category: "M" },
  { name: "JAT Holdings PLC.", category: "F" },
  { name: "BCD Travel APAC Service Centre (Pvt) Ltd.", category: "F" },
  { name: "Watercare Technologies (Pvt) Ltd.", category: "F" }
];

let orgList = [
    {
        "given_name": "BOC Travels",
        "id": 2169922,
        "customer_code": "P_B0027",
        "name": "BOCTravelsPrivateLimited",
        "display_name": "BOC Travels (Private) Limited."
    },
    {
        "given_name": "Bodyline B028",
        "id": 2331328,
        "customer_code": "P_B0028",
        "name": "BodylinePrivateLimited",
        "display_name": "Bodyline (Private) Limited."
    },
    {
        "given_name": "Colma",
        "id": 2301574,
        "customer_code": "P_C0052",
        "name": "COLMAPrivateLimited",
        "display_name": "COLMA (Private) Limited."
    },
    {
        "given_name": "British Broadcasting",
        "id": 2119574,
        "customer_code": "P_B0026",
        "name": "BritishBroadcastingCorporation",
        "display_name": "British Broadcasting Corporation"
    },
    {
        "given_name": "Experties",
        "id": 2226080,
        "customer_code": "P_E0022",
        "name": "ExpertiseFrance",
        "display_name": "Expertise France"
    },
    {
        "given_name": "Citrus Silver",
        "id": 212257,
        "customer_code": "P_C0015",
        "name": "CitrusSilverLtd",
        "display_name": "Citrus Silver Ltd. "
    },
    {
        "given_name": "Fire X",
        "id": 2187582,
        "customer_code": "P_F0019",
        "name": "FireXProjectPrivateLimited",
        "display_name": "Fire X Project (Private) Limited"
    },
    {
        "given_name": "Dialog",
        "id": 1063350,
        "customer_code": "P_D0019",
        "name": "DialogAxiataPLC",
        "display_name": "Dialog Axiata PLC."
    },
    {
        "given_name": "H connect (Chech Each & evry Hire)",
        "id": 2094946,
        "customer_code": "P_H0029",
        "name": "HConnectInternationalPvtLtd",
        "display_name": "H Connect International (Pvt) Ltd"
    },
    {
        "given_name": "Dialog WTC",
        "id": 1380714,
        "customer_code": "P_B0020",
        "name": "BharthiAirtelLankaPrivateLimited",
        "display_name": "Dialog Axiata PLC. WTC Branch"
    },
    {
        "given_name": "John morris",
        "id": 216266,
        "customer_code": "P_L0003",
        "name": "LabfriendPvtLtd",
        "display_name": "John Morris Group (Pvt) Ltd"
    },
    {
        "given_name": "Eiger Holdings",
        "id": 2004588,
        "customer_code": "P_E0021",
        "name": "EigerHoldingsPVTLtd",
        "display_name": "Eiger Holdings (PVT) Ltd"
    },
    {
        "given_name": "Landster",
        "id": 1957888,
        "customer_code": "P_L0014",
        "name": "LandsterLankaPvtLtd",
        "display_name": "Landster Lanka (Pvt) Ltd."
    },
    {
        "given_name": "Flora Food",
        "id": 1368568,
        "customer_code": "P_U0016",
        "name": "UpFieldLankaPrivateLimited",
        "display_name": "Flora Food Management Lanka (Pvt) Ltd"
    },
    {
        "given_name": "Medisans Sans",
        "id": 447246,
        "customer_code": "P_M0018",
        "name": "MedecinsSansFrontiersMSFSouthAsiaGuaranteeLimited",
        "display_name": "Medecins Sans Frontiers (MSF) South Asia (Guarantee) Limited"
    },
    {
        "given_name": "Future Fibes",
        "id": 1332426,
        "customer_code": "P_F0017",
        "name": "FutureFibresLankaPVTLtd",
        "display_name": "Future Fibres Lanka (PVT) Ltd"
    },
    {
        "given_name": "Mobitel",
        "id": 1671645,
        "customer_code": "P_M0037",
        "name": "MobitelPVTLtd",
        "display_name": "Mobitel (PVT) Ltd"
    },
    {
        "given_name": "Galle Face",
        "id": 1560784,
        "customer_code": "P_G0014",
        "name": "GalleFaceHotel1994PVTLtd",
        "display_name": "Galle Face Hotel - 1994 (Pvt) Ltd"
    },
    {
        "given_name": "National Credit (Chech Each & evry Hire)",
        "id": 1954286,
        "customer_code": "P_N0019",
        "name": "NationalCreditGuaranteeInstitutionLimitedNCGIL",
        "display_name": "National Credit Guarantee Institution Limited. (NCGIL)"
    },
    {
        "given_name": "GTN Networks",
        "id": 2302767,
        "customer_code": "P_G0017",
        "name": "GTNTechnologiesPvtLtd",
        "display_name": "GTN Technologies (Pvt) Ltd"
    },
    {
        "given_name": "National Savings Bank (Chech Each & evry Hire)",
        "id": 2263891,
        "customer_code": "P_N0021",
        "name": "NationalSavingsBank",
        "display_name": "National Savings Bank"
    },
    {
        "given_name": "Helman MAS",
        "id": 825087,
        "customer_code": "P_H0014",
        "name": "HellmannMASSupplyChainPrivateLimited",
        "display_name": "Hellmann MAS Supply Chain (Private) Limited."
    },
    {
        "given_name": "Robert Bosch (Chech Each & evry Hire)",
        "id": 504516,
        "customer_code": "P_R0009",
        "name": "RobertBoschLankaPvtLtd",
        "display_name": "Robert Bosch Lanka (Pvt)  Ltd"
    },
    {
        "given_name": "HSBC",
        "id": 2868781,
        "customer_code": "H0004",
        "name": "V-HSBCBusinessRuns",
        "display_name": "HSBC Business Runs"
    },
    {
        "given_name": "Christ Lanka",
        "id": 2496884,
        "customer_code": "P_C0056",
        "name": "ChristicLankaPolymersPvtLtd",
        "display_name": "Christic Lanka Polymers (Pvt) Ltd"
    },
    {
        "given_name": "Healthrecon",
        "id": 1917763,
        "customer_code": "P_H0027",
        "name": "HealthreconConnectPVTLtd",
        "display_name": "Healthrecon Connect (PVT) Ltd"
    },
    {
        "given_name": "I 2 ENT",
        "id": 2532698,
        "customer_code": "P_I0025",
        "name": "I2ENTConsultancyPVTLtd",
        "display_name": "I 2 E.N.T Consultancy (PVT) Ltd"
    },
    {
        "given_name": "MAS Innovation",
        "id": 1539265,
        "customer_code": "P_M0034",
        "name": "MASInnovationPrivateLimited",
        "display_name": "MAS Innovation (Private) Limited."
    },
    {
        "given_name": "Meigomei",
        "id": 1859024,
        "customer_code": "P_M0039",
        "name": "MeigaomeiSalesPVTLtd",
        "display_name": "Meigaomei Sales (PVT) Ltd"
    },
    {
        "given_name": "Millemium IT",
        "id": 1872659,
        "customer_code": "P_M0040",
        "name": "MilleniumITESPPvtLtd",
        "display_name": "Millenium I.T.E.S.P (Pvt) Ltd"
    },
    {
        "given_name": "SL Ins of Biotechlogy",
        "id": 2573317,
        "customer_code": "P_S0065",
        "name": "SriLankaInstituteofBiotechnologyPvtLtd",
        "display_name": "Sri Lanka Institute of Biotechnology (Pvt) Ltd"
    },
    {
        "given_name": "Muve Colombo",
        "id": 1630454,
        "customer_code": "P_M0036",
        "name": "MuveColomboPVTLtd",
        "display_name": "Muve Colombo (PVT) Ltd"
    },
    {
        "given_name": "North Manufacturing",
        "id": 2594069,
        "customer_code": "P_N0023",
        "name": "NorthManufacturingPvtLtd",
        "display_name": "North Manufacturing (Pvt) Ltd."
    },
    {
        "given_name": "Seylan Bank",
        "id": 1255201,
        "customer_code": "P_S0044",
        "name": "SeylanBankPLC",
        "display_name": "Seylan Bank PLC"
    },
    {
        "given_name": "Musaeus Collage",
        "id": 2692832,
        "customer_code": "P_M0042",
        "name": "MusaeusCollege",
        "display_name": "Musaeus College"
    },
    {
        "given_name": "Seylan Bank RED",
        "id": 2188303,
        "customer_code": "P_S0058",
        "name": "SeylanREDHighNetworthBankingUnit2",
        "display_name": "Seylan RED High Net worth Banking Unit 2"
    },
    {
        "given_name": "Nation Orthocare",
        "id": 2710861,
        "customer_code": "P_N0024",
        "name": "NationOrthocarePvtLtd",
        "display_name": "Nation Orthocare (Pvt) Ltd."
    },
    {
        "given_name": "Singer",
        "id": 2347527,
        "customer_code": "P_S0060",
        "name": "SingerSriLankaPLC",
        "display_name": "Singer (Sri Lanka) PLC"
    },
    {
        "given_name": "Lalan Fabrics",
        "id": 2718792,
        "customer_code": "P_L0018",
        "name": "LalanFabricsPrivateLimited",
        "display_name": "Lalan Fabrics (Private) Limited."
    },
    {
        "given_name": "Sysco Labs Staff",
        "id": 1430237,
        "customer_code": "P_S0047",
        "name": "SyscoLabsTechnologiesPvtLtdStaffTransport",
        "display_name": "Sysco Labs Technologies (Pvt) Ltd - (Staff Transport)"
    },
    {
        "given_name": "Mireka Seascape",
        "id": 2801491,
        "customer_code": "P_M0043",
        "name": "MirekaSeascapePrivateLimited",
        "display_name": "Mireka Seascape (Private) Limited."
    },
    {
        "given_name": "Union Bank",
        "id": 7371,
        "customer_code": "P_U0001",
        "name": "UnionBankColomboPlc",
        "display_name": "Union Bank Colombo Plc"
    },
    {
        "given_name": "Vitahub",
        "id": 2827768,
        "customer_code": "P_V0017",
        "name": "VITALHUBPVTLTD",
        "display_name": "VITALHUB (PVT) LTD."
    },
    {
        "given_name": "Waterfront",
        "id": 1426633,
        "customer_code": "P_W0017",
        "name": "WaterfrontPropertiesPvtLtd",
        "display_name": "Waterfront Properties (Pvt) Ltd"
    },
    {
        "given_name": "Janashakthi Insurance",
        "id": 2832448,
        "customer_code": "P_J0008",
        "name": "JanashakthiInsurancePLC",
        "display_name": "Janashakthi Insurance PLC"
    },
    {
        "given_name": "Sri Lanka Cert",
        "id": 256104,
        "customer_code": "P_S0021",
        "name": "SriLankaCertPvtLtd",
        "display_name": "Sri Lanka Cert (Pvt) Ltd"
    },
    {
        "given_name": "Port City BPO",
        "id": 2832410,
        "customer_code": "P_P0033",
        "name": "PortCityBPOPvtLtd",
        "display_name": "Port City BPO (Pvt) Ltd"
    },
    {
        "given_name": "Huawei",
        "id": 2471547,
        "customer_code": "P_H0030",
        "name": "HuaweiTechnologiesLankacoPvtLtd",
        "display_name": "Huawei Technologies Lanka co. (Pvt) Ltd"
    },
    {
        "given_name": "JAT holding",
        "id": 3006095,
        "customer_code": "P_J0010",
        "name": "JATHoldingsPLC",
        "display_name": "JAT Holdings PLC."
    },
    {
        "given_name": "BCD Travels",
        "id": 2937110,
        "customer_code": "P_B0030",
        "name": "BCDTravelAPACServiceCentrePvtLtd",
        "display_name": "BCD Travel APAC Service Centre (Pvt) Ltd."
    },
    {
        "given_name": "Watercare",
        "id": 2936962,
        "customer_code": "P_W0024",
        "name": "WatercareTechnologiesPvtLtd",
        "display_name": "Watercare Technologies (Pvt) Ltd."
    }
]
let notFoundOrgList = [
    "Corellex",
    "ISA",
];

router.get("/category_change", function (req, res, next) {
  const connectionMain = mysql.createConnection(db);
  let error = [];

  connectionMain.connect(function (err) {
    if (err) {
      connectionMain.end();
      res.json({ Data: "Error1" });
    } else {
        let foundList = [];
        let notFoundList = [];
        let duplicateList = [];
        for (let i = 0; i < companies.length; i++) {
            const company = companies[i];
            connectionMain.query(
                "SELECT id, customer_code, name, display_name, agreement_categories FROM organization WHERE display_name = ?",
                [company.name],
                function (err, result) {
                if (err) {
                    res.json({ Data: "Error2" });
                } else {
                    if (result && result.length) {
                        if (result.length > 1) {
                            duplicateList.push(result);
                        } else {
                            foundList.push({given_name: givenCompanies[i].name, ...result[0] });
                        }
                    } else {
                        notFoundList.push(company.name);
                    }
                }
                },
            );
        }
        setTimeout(() => {
            res.json({ Data: { foundList, notFoundList, duplicateList } });
        }, 5000);
        connectionMain.end();
    }
  });
});

router.get("/update", async function (req, res) {
    const connectionMain = mysql.createConnection(db);

    try {
        await new Promise((resolve, reject) => {
            connectionMain.connect(err => {
                if (err) reject(err);
                else resolve();
            });
        });

        await new Promise((resolve, reject) => {
            connectionMain.beginTransaction(err => {
                if (err) reject(err);
                else resolve();
            });
        });

        const onlyBudgetOrg = [];

        await Promise.all(
            orgList.map(org => {
                return new Promise((resolve, reject) => {

                    connectionMain.query(
                        `SELECT
                            id,
                            agreement_categories,
                            budget_invoicing_generate_type AS btype
                        FROM organization
                        WHERE id = ?`,
                        [org.id],
                        function (err, results) {

                            if (err) {
                                return reject(err);
                            }

                            if (
                                results &&
                                results.length &&
                                results[0].agreement_categories === "Budget"
                            ) {

                                connectionMain.query(
                                    `UPDATE organization
                                     SET car_invoicing_generate_type = ?,
                                         agreement_categories = ?
                                     WHERE id = ?`,
                                    [
                                        results[0].btype,
                                        "Car",
                                        org.id
                                    ],
                                    function (err) {

                                        if (err) {
                                            return reject(err);
                                        }

                                        onlyBudgetOrg.push({
                                            ...org,
                                            btype: results[0].btype
                                        });

                                        resolve();
                                    }
                                );

                            } else {
                                resolve();
                            }
                        }
                    );
                });
            })
        );

        await new Promise((resolve, reject) => {
            connectionMain.commit(err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });

        res.json({
            Data: "Successfully updated budget organizations",
            count: onlyBudgetOrg.length,
            organizations: onlyBudgetOrg
        });

    } catch (err) {

        try {
            await new Promise(resolve => {
                connectionMain.rollback(() => resolve());
            });
        } catch (rollbackErr) {
            console.error("Rollback Error:", rollbackErr);
        }

        console.error(err);

        res.status(500).json({
            Data: "Transaction rolled back",
            error: err.message
        });

    } finally {
        connectionMain.end();
    }
});

export default router;
