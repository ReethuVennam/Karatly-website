import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "34.47.168.236",
  port: Number(process.env.DB_PORT) || 7306,
  user: process.env.DB_USER || "sbuser",
  password: process.env.DB_PASSWORD || "KMmTKeK7yh77odw51gK12f",
  database: process.env.DB_NAME || "sabbpekaratly",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+05:30",
});

export default pool;
