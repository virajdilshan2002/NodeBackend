import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const HOST = process.env.HOST;
const USER = process.env.USER;
const PASSWORD = process.env.PASSWORD;
const DATABASE = process.env.DATABASE;

const CorporateDBConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: HOST,
      user: USER,
      password: PASSWORD,
      database: DATABASE,
    });

    console.log("Corporate DB Connected Successfully!");
    return connection;
  } catch (error) {
    return "Corporate DB Connection Error:" + error;
  }
};

export default CorporateDBConnection;
