import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "", // default XAMPP kosong
  database: "jimpitan_db",
});

export default db;