import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_DB_URL = process.env.MONGO_DB_URL;
const DBConnection = async () => {
    try {
        const connection = await mongoose.connect(MONGO_DB_URL);
        console.log(`Successfully connected to MongoDB: ${connection.connection?.host}`);
        return connection;
    } catch (error) {
        return "Mongo DB Connection Error:" + error;
    }
}

export default DBConnection;