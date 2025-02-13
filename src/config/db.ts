import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "";

if (!MONGO_URI) {
  throw new Error("Por favor define la variable de entorno MONGO_URI en .env.local");
}

// Usamos una variable global para que la conexión se reutilice
// y evitar crear múltiples conexiones en desarrollo.
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    console.log("⚡️ Usando conexión existente a MongoDB.");
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("🔄 Conectando a MongoDB...");
    cached.promise = mongoose
      .connect(MONGO_URI)
      .then((mongoose) => {
        console.log("✅ Conectado exitosamente a MongoDB.");
        return mongoose;
      })
      .catch((err) => {
        console.error("❌ Error al conectar a MongoDB:", err.message);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err:any) {
    console.error("❌ Error durante la conexión:", err.message);
    throw err;
  }
}

export default connectDB;
