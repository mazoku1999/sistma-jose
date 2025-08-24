import mysql from "mysql2/promise"

// Configuración de la conexión a la base de datos
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "mazoku1?",
  database: process.env.DB_NAME || "sis_escolar",
  // Configuración del pool de conexiones (solo opciones válidas para mysql2)
  connectionLimit: 70, // Máximo 10 conexiones simultáneas
  queueLimit: 0, // Sin límite en la cola de espera
  charset: 'utf8mb4', // Soporte completo para UTF-8
  timezone: '+00:00', // UTC timezone
}

// Usar variable global para asegurar singleton en entornos con HMR (Next.js dev)
declare global {
  // eslint-disable-next-line no-var
  var __mysqlPool__: mysql.Pool | undefined
}

function createPool() {
  return mysql.createPool(dbConfig)
}

// Pool de conexiones para reutilizar conexiones (singleton)
export const pool: mysql.Pool = global.__mysqlPool__ ?? createPool()
if (process.env.NODE_ENV !== 'production') {
  global.__mysqlPool__ = pool
}

// Función para ejecutar consultas SQL
export async function executeQuery<T>(query: string, params: any[] = []): Promise<T> {
  try {
    // Si es una transacción, usar query en lugar de execute
    if (query.trim().toUpperCase() === "START TRANSACTION" ||
      query.trim().toUpperCase() === "COMMIT" ||
      query.trim().toUpperCase() === "ROLLBACK") {
      const [rows] = await pool.query(query)
      return rows as T
    }

    // Para INSERT, usar query para obtener el insertId
    if (query.trim().toUpperCase().startsWith("INSERT")) {
      const [result] = await pool.query(query, params)
      return result as T
    }

    const [rows] = await pool.execute(query, params)
    return rows as T
  } catch (error) {
    console.error("Error ejecutando consulta SQL:", error)
    throw error
  }
}

// Función para obtener una conexión del pool
export async function getConnection() {
  try {
    return await pool.getConnection()
  } catch (error) {
    console.error("Error obteniendo conexión:", error)
    throw error
  }
}

// Función para iniciar una transacción
export async function beginTransaction() {
  const connection = await getConnection()
  try {
    await connection.beginTransaction()
    return connection
  } catch (error) {
    connection.release()
    throw error
  }
}

// Función para confirmar una transacción
export async function commitTransaction(connection: mysql.PoolConnection) {
  try {
    await connection.commit()
  } finally {
    connection.release()
  }
}

// Función para revertir una transacción
export async function rollbackTransaction(connection: mysql.PoolConnection) {
  try {
    await connection.rollback()
  } finally {
    connection.release()
  }
}

// Variable para evitar múltiples llamadas a closePool
let isClosing = false

// Función para cerrar el pool de conexiones (útil para testing o shutdown)
export async function closePool() {
  if (isClosing) return
  isClosing = true

  try {
    await pool.end()
    console.log("Pool de conexiones cerrado correctamente")
  } catch (error) {
    console.error("Error cerrando pool de conexiones:", error)
  }
}

// Usar una variable global para evitar múltiples registros en Next.js dev
declare global {
  var __db_listeners_registered: boolean | undefined
}

// Manejo de señales para cerrar el pool gracefully (solo una vez)
const gracefulShutdown = async (signal: string) => {
  if (!isClosing) {
    console.log(`Recibida señal ${signal}. Cerrando pool de conexiones...`)
    await closePool()
    process.exit(0)
  }
}

// Registrar listeners solo una vez usando variable global
if (!global.__db_listeners_registered) {
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

  // Logs de conexiones (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    pool.on('connection', (connection) => {
      console.log('Nueva conexión establecida como id ' + connection.threadId)
    })
  }

  global.__db_listeners_registered = true
}
