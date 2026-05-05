import CorporateDBConnection from "../db/corporatedb.js";

async function updateVehicleRate() {
  const connection = await CorporateDBConnection();

  const [orgs] = await connection.query("SELECT * FROM organization");

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

  console.log(`organizations count: `, orgs.length);

  for (const org of orgs) {
    const vehicle_rates = JSON.parse(org.vehicle_rates);

    org.discount = { ...defaultDiscount };
    org.special_discount = { ...defaultDiscount };
    if (
      vehicle_rates &&
      Array.isArray(vehicle_rates) &&
      vehicle_rates.length > 0
    ) {
      for (const rate of vehicle_rates) {
        const type = rate.type;

        if (org.discount[type] !== undefined) {
          org.discount[type] = rate.discount;
        }

        if (org.special_discount[type] !== undefined) {
          org.special_discount[type] = rate.special_discount;
        }
      }
    } else {
      console.warn(
        `\n**ERROR** : Organization ${org.id} has invalid or empty vehicle_rates\n`,
      );
    }

    //save
    const [rows] = await connection.query(
      "UPDATE organization SET discount = ?, special_discount = ? WHERE id = ?",
      [
        JSON.stringify(org.discount),
        JSON.stringify(org.special_discount),
        org.id,
      ],
    );

    console.log(`Updated org ${org.id} with discount and special_discount`);
  }

  await connection.end();
}

updateVehicleRate();
