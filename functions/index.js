const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const papaparse = require("papaparse");

admin.initializeApp();
const db = admin.firestore();

/**
 * Parses a CSV file buffer and returns the data as an array of objects.
 * @param {Buffer} csvBuffer The CSV file content as a buffer.
 * @returns {Promise<Array<object>>} A promise that resolves with the parsed data.
 */
const parseCsv = (csvBuffer) => {
  return new Promise((resolve, reject) => {
    const csvString = csvBuffer.toString("utf8");
    papaparse.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length) {
          reject(results.errors);
        } else {
          resolve(results.data);
        }
      },
      error: (error) => reject(error),
    });
  });
};

/**
 * Cloud Function to handle inventory CSV uploads.
 * It expects a CSV with columns: id, name, description, price, stock.
 */
exports.uploadInventoryCsv = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const inventoryData = await parseCsv(req.rawBody);
      const batch = db.batch();
      const inventoryCollection = db.collection(`artifacts/${req.query.appId}/public/data/inventory`);

      inventoryData.forEach((item) => {
        const docRef = inventoryCollection.doc(item.id || `item-${Date.now()}-${Math.random()}`);
        batch.set(docRef, {
          name: item.name || "No Name",
          description: item.description || "",
          price: Number(item.price) || 0,
          stock: Number(item.stock) || 0,
          pictureUrl: item.pictureUrl || `https://placehold.co/300x300/F5F5F5/4A4A4A?text=New`,
          id: docRef.id,
        });
      });

      await batch.commit();
      res.status(200).send({ message: `Successfully uploaded ${inventoryData.length} inventory items.` });
    } catch (error) {
      console.error("Inventory Upload Error:", error);
      res.status(500).send({ message: "Error processing CSV file.", error: error.message });
    }
  });
});

/**
 * Cloud Function to handle new employee CSV uploads.
 * It expects a CSV with columns: username, password, role, points.
 */
exports.uploadEmployeesCsv = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }
    
    try {
      const employeeData = await parseCsv(req.rawBody);
      const batch = db.batch();
      const usersCollection = db.collection(`artifacts/${req.query.appId}/public/data/users`);

      employeeData.forEach((emp) => {
        const docRef = usersCollection.doc();
        batch.set(docRef, {
            username: emp.username || `user-${Date.now()}`,
            password: emp.password || "password123",
            role: emp.role || "employee",
            points: Number(emp.points) || 0,
            pictureUrl: emp.pictureUrl || `https://placehold.co/100x100/4A90E2/FFFFFF?text=N`,
            id: docRef.id
        });
      });

      await batch.commit();
      res.status(200).send({ message: `Successfully uploaded ${employeeData.length} new employees.` });
    } catch (error) {
      console.error("Employee Upload Error:", error);
      res.status(500).send({ message: "Error processing CSV file.", error: error.message });
    }
  });
});


/**
 * Cloud Function to handle points updates from a CSV.
 * It expects a CSV with columns: id, points_to_add.
 */
exports.uploadPointsCsv = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const pointsData = await parseCsv(req.rawBody);
      const batch = db.batch();
      const usersCollection = db.collection(`artifacts/${req.query.appId}/public/data/users`);

      for (const update of pointsData) {
        if (!update.id || !update.points_to_add) continue;
        
        const docRef = usersCollection.doc(update.id);
        const amount = Number(update.points_to_add);
        
        // Use a transaction-like update with FieldValue to prevent race conditions
        batch.update(docRef, {
            points: admin.firestore.FieldValue.increment(amount)
        });
      }

      await batch.commit();
      res.status(200).send({ message: `Successfully processed ${pointsData.length} points updates.` });
    } catch (error) {
      console.error("Points Upload Error:", error);
      res.status(500).send({ message: "Error processing CSV file.", error: error.message });
    }
  });
});
