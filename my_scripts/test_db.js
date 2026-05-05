import CorporateDBConnection from "../db/corporatedb.js";

export async function TestDB() {
  const connection = await CorporateDBConnection();
}
