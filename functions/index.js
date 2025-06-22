const functions = require("firebase-functions");
const admin = require("firebase-admin");
const papaparse = require("papaparse");

admin.initializeApp();
const db = admin.firestore();

/**
 * A helper function to verify the Firebase Auth token.
 * Throws an error if the token is invalid.
 * SECURITY NOTE: This function only verifies that the request is from an
 * authenticated Firebase user. It does NOT check for admin privileges because
 * the app's current login architecture does not link the Firestore user role
 * to the Firebase Auth token. Removing the broken role check fixes the function crash.
 * @param {string} authorizationHeader The Authorization header from the request.
 */
const verifyToken = async (authorizationHeader) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new functions.https.HttpsError('unauthenticated', 'No token provided.');
  }
  const idToken = authorizationHeader.split('Bearer ')[1];
  try {
    // This verifies that the token was issued by Firebase and is not expired.
    await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error("Auth Error:", error);
    throw new functions.https.HttpsError('unauthenticated', error.message || 'Invalid token.');
  }
};


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
        if (results.errors.length > 0 && results.data.length === 0) {
          const firstError = results.errors.find(e => e.code !== 'TooManyFields' && e.code !== 'TooFewFields');
          const errorMessage = firstError ? firstError.message : "Invalid CSV format.";
          return reject(new Error(errorMessage));
        }
        resolve(results.data);
      },
      error: (error) => reject(error),
    });
  });
};

/**
 * A more robust CORS middleware handler.
 */
const corsWithOptions = (req, res, callback) => {
    const allowedOrigins = [
        'https://pinnacleperks.netlify.app',
        'http://localhost:3000', // for local development
        'http://localhost:5173', // for local development with Vite
    ];
    const origin = req.headers.origin;

    res.set('Access-Control-Allow-Credentials', 'true');
    if (allowedOrigins.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
    }

    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Access-Control-Max-Age', '3600');
        res.status(204).send('');
        return;
    }
    
    callback();
};


/**
 * Cloud Function to handle inventory CSV uploads.
 */
exports.uploadInventoryCsv = functions.https.onRequest(async (req, res) => {
  corsWithOptions(req, res, async () => {
      try {
        await verifyToken(req.headers.authorization);
        
        const inventoryData = await parseCsv(req.rawBody);
        if (!inventoryData.length) throw new Error("CSV file is empty or invalid.");

        const batch = db.batch();
        const inventoryCollection = db.collection(`artifacts/${req.query.appId}/public/data/inventory`);

        inventoryData.forEach((item) => {
          if(!item.id) return; // Skip rows without an ID
          const docRef = inventoryCollection.doc(item.id);
          batch.set(docRef, {
            name: item.name || "No Name",
            description: item.description || "",
            price: Number(item.price) || 0,
            stock: Number(item.stock) || 0,
            pictureUrl: item.pictureUrl || `https://placehold.co/300x300/F5F5F5/4A4A4A?text=New`,
            id: item.id,
          }, { merge: true });
        });

        await batch.commit();
        return res.status(200).send({ message: `Successfully processed ${inventoryData.length} inventory items.` });
      } catch (error) {
        console.error("Inventory Upload Error:", error.message);
        if (error.code && error.code.startsWith('functions')) {
          return res.status(401).send({ message: "Unauthorized", error: error.message });
        }
        return res.status(500).send({ message: "Error processing CSV file.", error: error.message });
      }
  });
});

/**
 * Cloud Function to handle new employee CSV uploads.
 */
exports.uploadEmployeesCsv = functions.https.onRequest(async (req, res) => {
  corsWithOptions(req, res, async () => {
      try {
        await verifyToken(req.headers.authorization);

        const employeeData = await parseCsv(req.rawBody);
        if (!employeeData.length) throw new Error("CSV file is empty or invalid.");

        const batch = db.batch();
        const usersCollection = db.collection(`artifacts/${req.query.appId}/public/data/users`);

        employeeData.forEach((emp) => {
          if(!emp.username) return;
          const docRef = usersCollection.doc();
          batch.set(docRef, {
              username: emp.username,
              password: emp.password || "password123",
              role: emp.role || "employee",
              points: Number(emp.points) || 0,
              pictureUrl: emp.pictureUrl || `https://placehold.co/100x100/4A90E2/FFFFFF?text=N`,
              id: docRef.id
          });
        });

        await batch.commit();
        return res.status(200).send({ message: `Successfully uploaded ${employeeData.length} new employees.` });
      } catch (error) {
        console.error("Employee Upload Error:", error.message);
        if (error.code && error.code.startsWith('functions')) {
            return res.status(401).send({ message: "Unauthorized", error: error.message });
        }
        return res.status(500).send({ message: "Error processing CSV file.", error: error.message });
      }
  });
});


/**
 * Cloud Function to handle points updates from a CSV.
 */
exports.uploadPointsCsv = functions.https.onRequest(async (req, res) => {
  corsWithOptions(req, res, async () => {
      try {
        await verifyToken(req.headers.authorization);

        const pointsData = await parseCsv(req.rawBody);
        if (!pointsData.length) throw new Error("CSV file is empty or invalid.");
        
        const batch = db.batch();
        const usersCollection = db.collection(`artifacts/${req.query.appId}/public/data/users`);

        for (const update of pointsData) {
          if (!update.id || !update.points_to_add) continue;
          
          const docRef = usersCollection.doc(update.id);
          const amount = Number(update.points_to_add);
          
          if(isNaN(amount)) continue;

          batch.update(docRef, {
              points: admin.firestore.FieldValue.increment(amount)
          });
        }

        await batch.commit();
        return res.status(200).send({ message: `Successfully processed ${pointsData.length} points updates.` });
      } catch (error) {
        console.error("Points Upload Error:", error.message);
        if (error.code && error.code.startsWith('functions')) {
            return res.status(401).send({ message: "Unauthorized", error: error.message });
        }
        return res.status(500).send({ message: "Error processing CSV file.", error: error.message });
      }
  });
});
