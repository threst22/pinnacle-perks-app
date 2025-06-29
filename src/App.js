import React, { useState, useEffect, createContext, useContext, useRef, useCallback, useMemo } from 'react';

// --- Firebase SDK Imports ---
// These are assumed to be available in the environment
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, writeBatch, runTransaction, getDocs } from 'firebase/firestore';

// --- SVG Icons (Replacement for lucide-react) ---
const Icon = ({ children, className = '', size = 24 }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        {children}
    </svg>
);

const Camera = ({ className, size }) => (
    <Icon className={className} size={size}>
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
    </Icon>
);

const Upload = ({ className, size }) => (
    <Icon className={className} size={size}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </Icon>
);

const Download = ({ className, size }) => (
    <Icon className={className} size={size}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </Icon>
);

const X = ({ className, size }) => (
    <Icon className={className} size={size}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Icon>
);

const Edit = ({ className, size }) => (
    <Icon className={className} size={size}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></Icon>
);

const Save = ({ className, size }) => (
    <Icon className={className} size={size}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></Icon>
);

const PlusCircle = ({ className, size }) => (
    <Icon className={className} size={size}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></Icon>
);

const MinusCircle = ({ className, size }) => (
    <Icon className={className} size={size}><circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" /></Icon>
);

const CheckCircle = ({ className, size }) => (
    <Icon className={className} size={size}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></Icon>
);

const XCircle = ({ className, size }) => (
    <Icon className={className} size={size}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></Icon>
);

const FileText = ({ className, size }) => (
    <Icon className={className} size={size}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></Icon>
);

const UserPlus = ({ className, size }) => (
    <Icon className={className} size={size}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" /></Icon>
);

const ShoppingCart = ({ className, size }) => (
    <Icon className={className} size={size}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></Icon>
);

const LogOut = ({ className, size }) => (
    <Icon className={className} size={size}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></Icon>
);

const Settings = ({ className, size }) => (
    <Icon className={className} size={size}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1.51-1V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1h.44a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></Icon>
);

const Users = ({ className, size }) => (
    <Icon className={className} size={size}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon>
);

const Box = ({ className, size }) => (
    <Icon className={className} size={size}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></Icon>
);

const BarChart2 = ({ className, size }) => (
    <Icon className={className} size={size}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></Icon>
);

const Loader2 = ({ className, size }) => (
    <Icon className={className} size={size}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></Icon>
);

const KeyRound = ({ className, size }) => (
    <Icon className={className} size={size}>
        <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
        <circle cx="16.5" cy="7.5" r=".5" />
    </Icon>
);

// --- Constants ---
const DEPARTMENTS = ['Accounting', 'Service and Sales', 'Warranty', 'Payables', 'Parts'];

// --- Firebase Configuration & Initialization ---
let app, auth, db;
// Cloud Function URLs - Replace with your deployed function URLs
const CLOUD_FUNCTIONS_URL = "https://us-central1-pinnacle2-ab305.cloudfunctions.net";
const INVENTORY_UPLOAD_URL = `${CLOUD_FUNCTIONS_URL}/uploadInventoryCsv`;
const EMPLOYEES_UPLOAD_URL = `${CLOUD_FUNCTIONS_URL}/uploadEmployeesCsv`;
const POINTS_UPLOAD_URL = `${CLOUD_FUNCTIONS_URL}/uploadPointsCsv`;

try {
    // These global variables are expected to be injected by the hosting environment.
    const firebaseConfig = typeof __firebase_config !== 'undefined' 
        ? JSON.parse(__firebase_config)
        : {
            apiKey: "AIzaSyAXPqrctzE76zeOrlYx8NoOSauj8wxxRA4",
            authDomain: "pinnacle2-ab305.firebaseapp.com",
            projectId: "pinnacle2-ab305",
            storageBucket: "pinnacle2-ab305.appspot.com",
            messagingSenderId: "847346950956",
            appId: "1:847346950956:web:feac3f5f83ac90e99f8289"
        };
    
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

} catch (error) {
    console.error("Firebase initialization failed:", error);
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'pinnacle-perks-default';

// --- App Context for Global State Management ---
const AppContext = createContext(null);

// --- Initial Data Seeding Logic ---
const getInitialSeedData = () => {
  const initialUsers = [
    { id: 'admin-01', username: 'admin', employeeName: 'Admin User', password: '1nTu1tu53r', role: 'admin', points: 1000000, pictureUrl: `https://placehold.co/100x100/E9A47C/FFFFFF?text=A`, forcePasswordChange: false, globalDiscount: 0, departments: ['Unassigned'] },
    { id: 'emp-01', username: 'alice', employeeName: 'Alice', password: 'password123', role: 'employee', points: 5000, pictureUrl: `https://placehold.co/100x100/4A90E2/FFFFFF?text=A`, forcePasswordChange: true, globalDiscount: 0, departments: ['Accounting'] },
    { id: 'emp-02', username: 'bob', employeeName: 'Bob', password: 'password123', role: 'employee', points: 7500, pictureUrl: `https://placehold.co/100x100/4A90E2/FFFFFF?text=B`, forcePasswordChange: false, globalDiscount: 5, departments: ['Service and Sales', 'Parts'] },
  ];
  const initialInventory = [
    { id: 'item-01', name: 'Company Hoodie', description: 'Comfortable and stylish company branded hoodie.', price: 2500, stock: 50, pictureUrl: `https://placehold.co/300x300/F5F5F5/4A4A4A?text=Hoodie`, discount: 0 },
    { id: 'item-02', name: 'Insulated Tumbler', description: 'Keeps your drinks hot or cold for hours.', price: 1200, stock: 100, pictureUrl: `https://placehold.co/300x300/F5F5F5/4A4A4A?text=Tumbler`, discount: 10 },
    { id: 'item-03', name: 'Wireless Mouse', description: 'Ergonomic wireless mouse for your setup.', price: 1800, stock: 75, pictureUrl: `https://placehold.co/300x300/F5F5F5/4A4A4A?text=Mouse`, discount: 0 },
    { id: 'item-04', name: 'Empty Item', description: 'This item has 0 stock.', price: 1000, stock: 0, pictureUrl: `https://placehold.co/300x300/F5F5F5/4A4A4A?text=Empty`, discount: 0 },
  ];
   const initialInflation = [...DEPARTMENTS, 'Unassigned'].reduce((acc, dept) => {
        acc[dept.toLowerCase().replace(/ /g, '')] = 0;
        return acc;
    }, {});

  return { initialUsers, initialInventory, initialInflation };
};

const seedDataToFirestore = async () => {
    if (!db) return;
    console.log("Seeding initial data to Firestore...");
    try {
        const batch = writeBatch(db);
        const { initialUsers, initialInventory, initialInflation } = getInitialSeedData();

        // Seed config
        const configRef = doc(db, `artifacts/${appId}/public/data/config`, "global");
        batch.set(configRef, { inflation: initialInflation, seeded: true });

        // Seed users
        initialUsers.forEach(user => {
            const userRef = doc(collection(db, `artifacts/${appId}/public/data/users`));
            batch.set(userRef, { ...user, id: userRef.id }); // Using auto-generated doc ID as id
        });

        // Seed inventory
        initialInventory.forEach(item => {
            const itemRef = doc(db, `artifacts/${appId}/public/data/inventory`, item.id);
            batch.set(itemRef, item);
        });

        await batch.commit();
        console.log("Seeding complete.");
    } catch (error) {
        console.error("Seeding failed:", error);
    }
};

// --- Main App Component ---
function App() {
  // --- State Management ---
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingState, setDeletingState] = useState({ type: null, id: null });


  // App Data State
  const [users, setUsers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [pointHistory, setPointHistory] = useState([]);
  const [inflation, setInflation] = useState({});
  const [cart, setCart] = useState({});

  // UI State
  const [loggedInUser, setLoggedInUser] = useState(null); // Local app user profile
  const [currentPage, setCurrentPage] = useState('store');
  const [notification, setNotification] = useState({ message: '', type: '', show: false });
  const [modal, setModal] = useState({ isOpen: false, title: '', content: '', onConfirm: () => {} });
  const notificationTimeout = useRef(null);

  // --- Derived State ---
  const isAdmin = loggedInUser?.role === 'admin';
  const pendingPurchasesCount = purchases.filter(p => p.status === 'pending').length;

  // --- Firebase Authentication ---
  useEffect(() => {
    if (!auth) {
      console.error("Firebase Auth is not available.");
      setIsLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            setFirebaseUser(user);
        } else {
            const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
            try {
                if (token) {
                    await signInWithCustomToken(auth, token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Firebase sign-in failed:", error);
            }
        }
        setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // --- Firestore Real-time Listeners ---
  useEffect(() => {
    if (!isAuthReady || !db) return;

    const unsubscribers = [];
    setIsLoading(true);

    const checkAndSeedData = async () => {
        const configRef = doc(db, `artifacts/${appId}/public/data/config`, "global");
        const configSnap = await getDoc(configRef);
        if (!configSnap.exists() || !configSnap.data().inflation) {
            await seedDataToFirestore();
        }
    };
    
    checkAndSeedData().then(() => {
        // Global Config Listener
        unsubscribers.push(onSnapshot(doc(db, `artifacts/${appId}/public/data/config`, "global"), (doc) => {
            setInflation(doc.data()?.inflation || {});
        }));

        // Users Listener
        unsubscribers.push(onSnapshot(query(collection(db, `artifacts/${appId}/public/data/users`)), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));

        // Inventory Listener
        unsubscribers.push(onSnapshot(query(collection(db, `artifacts/${appId}/public/data/inventory`)), (snapshot) => {
            setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));

        // Purchases Listener
        unsubscribers.push(onSnapshot(query(collection(db, `artifacts/${appId}/public/data/purchases`)), (snapshot) => {
            setPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));

        // Point History Listener
        unsubscribers.push(onSnapshot(query(collection(db, `artifacts/${appId}/public/data/point_history`)), (snapshot) => {
            setPointHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));
        
        setIsLoading(false);
    }).catch(error => {
        console.error("Error during seeding check:", error);
        setIsLoading(false);
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, [isAuthReady]);

  // Cart Listener
  useEffect(() => {
    if (!loggedInUser || !firebaseUser || !db) {
        setCart({});
        return;
    };

    const cartRef = doc(db, `artifacts/${appId}/users/${firebaseUser.uid}/cart`, 'current');
    const unsubscribe = onSnapshot(cartRef, (doc) => {
        setCart(doc.data()?.items || {});
    });

    return () => unsubscribe();
  }, [loggedInUser, firebaseUser]);
  
  const showNotification = useCallback((message, type = 'success', duration = 3000) => {
    if (notificationTimeout.current) {
        clearTimeout(notificationTimeout.current);
    }
    setNotification({ message, type, show: true });
    notificationTimeout.current = setTimeout(() => {
      setNotification({ message: '', type: '', show: false });
    }, duration);
  }, []);
  
  const handleLogout = useCallback(() => {
    setLoggedInUser(null);
    setCurrentPage('store');
    showNotification('You have been logged out.', 'info');
  }, [showNotification]);

  // Sync logged-in user data
  useEffect(() => {
    if (loggedInUser && users.length > 0) {
        const currentUserData = users.find(u => u.id === loggedInUser.id);
        if (currentUserData && JSON.stringify(currentUserData) !== JSON.stringify(loggedInUser)) {
            setLoggedInUser(currentUserData);
        } else if (!currentUserData) {
            handleLogout();
        }
    }
  }, [users, loggedInUser, handleLogout]);

  const showModal = (title, content, onConfirm) => {
    setModal({ isOpen: true, title, content, onConfirm });
  };
  
  const closeModal = () => {
    setModal({ isOpen: false, title: '', content: '', onConfirm: () => {} });
  };

  const handleLogin = (username, password) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setLoggedInUser(user);
      showNotification(`Welcome back, ${user.employeeName || user.username}!`, 'success');
    } else {
      showNotification('Invalid username or password.', 'error');
    }
  };
  
  const calculateItemPrice = useCallback((item, user) => {
      const basePrice = item.price || 0;
      const itemDiscount = item.discount || 0;
      
      let applicableInflation = 0;
      if(user?.role !== 'admin') {
          const userDepartments = user?.departments?.length ? user.departments : ['Unassigned'];
          const inflationRates = userDepartments.map(dept => {
            const key = dept.toLowerCase().replace(/ /g, '');
            return inflation[key] ?? inflation.unassigned ?? 0;
          });
          applicableInflation = Math.max(...inflationRates);
      }

      const discountedPrice = basePrice * (1 - itemDiscount / 100);
      const inflatedPrice = discountedPrice * (1 + applicableInflation / 100);
      
      return Math.round(inflatedPrice);
  }, [inflation]);
  
  const updateCartInFirestore = async (newCartItems) => {
    if (!loggedInUser || !firebaseUser || !db) return;
    const cartRef = doc(db, `artifacts/${appId}/users/${firebaseUser.uid}/cart`, 'current');
    await setDoc(cartRef, { items: newCartItems });
  };
  
  const addToCart = (itemId, quantity = 1) => {
      const item = inventory.find(i => i.id === itemId);
      const currentQuantityInCart = cart[itemId] || 0;
      if (item.stock < currentQuantityInCart + quantity) {
          showNotification('Not enough stock available.', 'error');
          return;
      }
      const newCart = { ...cart, [itemId]: (cart[itemId] || 0) + quantity };
      updateCartInFirestore(newCart);
      showNotification(`${item.name} added to cart.`, 'success');
  };
  
  const updateCartQuantity = (itemId, newQuantity) => {
     const item = inventory.find(i => i.id === itemId);
     if(newQuantity > item.stock) {
         showNotification(`Only ${item.stock} available in stock.`, 'error');
         newQuantity = item.stock;
     }
     const newCart = { ...cart };
     if (newQuantity <= 0) {
         delete newCart[itemId];
     } else {
         newCart[itemId] = newQuantity;
     }
     updateCartInFirestore(newCart);
  };

  const handlePurchaseRequest = async (userIdForCheckout = null) => {
      const checkoutUserId = isAdmin && userIdForCheckout ? userIdForCheckout : loggedInUser.id;
      const user = users.find(u => u.id === checkoutUserId);
      const userCart = cart;
      
      if (Object.keys(userCart).length === 0) {
          showNotification('Cart is empty.', 'error');
          return;
      }
      
      let subtotal = 0;
      const purchaseItems = Object.entries(userCart).map(([itemId, quantity]) => {
          const item = inventory.find(i => i.id === itemId);
          const purchasePrice = calculateItemPrice(item, user);
          subtotal += purchasePrice * quantity;
          return {
              id: item.id, name: item.name, originalPrice: item.price,
              itemDiscount: item.discount || 0,
              purchasePrice, // Price after item discount and inflation
              quantity, pictureUrl: item.pictureUrl
          };
      });

      const userDiscount = user.globalDiscount || 0;
      const totalCost = Math.round(subtotal * (1 - userDiscount / 100));
      
      let inflationAtPurchase = 0;
      if(user?.role !== 'admin') {
        const userDepartments = user?.departments?.length ? user.departments : ['Unassigned'];
        const inflationRates = userDepartments.map(dept => {
            const key = dept.toLowerCase().replace(/ /g, '');
            return inflation[key] ?? inflation.unassigned ?? 0;
        });
        inflationAtPurchase = Math.max(...inflationRates);
      }


      if (user.points < totalCost) {
          showNotification(`Not enough Pinn Points for ${user.employeeName || user.username}. Required: ${totalCost}, Available: ${user.points}`, 'error');
          return;
      }

      const newPurchase = {
          userId: user.id, 
          username: user.username,
          employeeName: user.employeeName,
          items: purchaseItems,
          subtotal,
          userDiscount,
          inflationAtPurchase: inflationAtPurchase,
          totalCost,
          date: new Date().toISOString(), 
          status: 'pending',
          redeemedBy: loggedInUser.id,
      };
      
      await addDoc(collection(db, `artifacts/${appId}/public/data/purchases`), newPurchase);
      await updateCartInFirestore({});
      
      showNotification('Purchase request submitted for approval!', 'success');
      setCurrentPage('store');
  };

  const handleCSVUpload = async (file, uploadUrl) => {
    if (!file) return;

    setIsUploading(true);
    showNotification("Uploading CSV...", "info", 10000);

    try {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch(`${uploadUrl}?appId=${appId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/csv',
                'Authorization': `Bearer ${token}`
            },
            body: file
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to upload CSV.');
        }

        showNotification(result.message, 'success');
    } catch (error) {
        console.error("CSV Upload failed:", error);
        showNotification(error.message, 'error');
    } finally {
        setIsUploading(false);
    }
  };
  
    const deleteAllEmployees = async () => {
        setDeletingState({ type: 'all-employees', id: 'all' });
        try {
            const employeesToDelete = users.filter(u => u.role === 'employee');
            if (employeesToDelete.length === 0) {
                showNotification("No employees to delete.", "info");
                return;
            }

            const batch = writeBatch(db);
            employeesToDelete.forEach(emp => {
                const userRef = doc(db, `artifacts/${appId}/public/data/users`, emp.id);
                batch.delete(userRef);
            });

            await batch.commit();
            showNotification(`${employeesToDelete.length} employee(s) deleted successfully.`, 'success');
        } catch (error) {
            console.error("Error deleting all employees:", error);
            showNotification(`Failed to delete employees: ${error.message}`, 'error');
        } finally {
            setDeletingState({ type: null, id: null });
        }
    };
    
    const deleteAllPurchases = async () => {
        setDeletingState({ type: 'all-purchases', id: 'all' });
        try {
            const purchasesCollectionRef = collection(db, `artifacts/${appId}/public/data/purchases`);
            const querySnapshot = await getDocs(purchasesCollectionRef);
            if(querySnapshot.empty) {
                showNotification("No purchase activities to delete.", "info");
                return;
            }

            const batch = writeBatch(db);
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            showNotification("All purchase activities have been reset.", "success");
        } catch (error) {
            console.error("Error deleting all purchases:", error);
            showNotification(`Failed to reset activities: ${error.message}`, 'error');
        } finally {
             setDeletingState({ type: null, id: null });
        }
    };

  const contextValue = {
    users, inventory, purchases, pointHistory, inflation, cart, firebaseUser,
    loggedInUser, currentPage, setCurrentPage,
    isAdmin, pendingPurchasesCount, isUploading, deletingState,
    notification,
    showNotification, handleLogin, handleLogout, calculateItemPrice, addToCart, updateCartQuantity, handlePurchaseRequest,
    handleCSVUpload, showModal, closeModal,
    setInflation: async (newInflation) => {
        const configRef = doc(db, `artifacts/${appId}/public/data/config`, "global");
        await updateDoc(configRef, { inflation: newInflation });
    },
    updateUser: async (userToUpdate, originalUser) => {
        try {
            const userRef = doc(db, `artifacts/${appId}/public/data/users`, userToUpdate.id);
            await updateDoc(userRef, userToUpdate);

            // Log points change if it happened and an original user was passed
            if (originalUser && userToUpdate.points !== originalUser.points) {
                const pointsChange = userToUpdate.points - originalUser.points;
                if(pointsChange !== 0) {
                    await addDoc(collection(db, `artifacts/${appId}/public/data/point_history`), {
                        userId: userToUpdate.id,
                        pointsAdded: pointsChange,
                        date: new Date().toISOString(),
                        reason: `Admin correction by ${loggedInUser.username}`
                    });
                }
            }
            showNotification("User updated successfully.", "success");
        } catch (error) {
            console.error("Error updating user:", error);
            showNotification(`Failed to update user: ${error.message}`, 'error');
        }
    },
    addUser: async (newUser) => {
        const docRef = await addDoc(collection(db, `artifacts/${appId}/public/data/users`), newUser);
        await updateDoc(docRef, { id: docRef.id });
    },
    deleteUser: async (userId, displayName) => {
        setDeletingState({ type: 'user', id: userId });
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/users`, userId));
            showNotification(`User "${displayName}" deleted successfully.`, 'info');
        } catch (error) {
            console.error("Error deleting user: ", error);
            showNotification(`Failed to delete user: ${error.message}`, 'error');
        } finally {
            setDeletingState({ type: null, id: null });
        }
    },
    deleteAllEmployees,
    deleteAllPurchases,
    updateItem: async (itemToUpdate) => {
        const itemRef = doc(db, `artifacts/${appId}/public/data/inventory`, itemToUpdate.id);
        await updateDoc(itemRef, itemToUpdate);
    },
    addItem: async (newItem) => {
        const itemRef = doc(db, `artifacts/${appId}/public/data/inventory`, newItem.id);
        await setDoc(itemRef, newItem);
    },
    deleteItem: async (itemId, itemName) => {
        setDeletingState({ type: 'item', id: itemId });
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/inventory`, itemId));
            showNotification(`Item "${itemName}" deleted successfully.`, 'info');
        } catch (error) {
            console.error("Error deleting item:", error);
            showNotification(`Failed to delete item: ${error.message}`, 'error');
        } finally {
            setDeletingState({ type: null, id: null });
        }
    },
    handleApproval: async (purchaseId, isApproved) => {
        try {
            await runTransaction(db, async (transaction) => {
                const purchaseRef = doc(db, `artifacts/${appId}/public/data/purchases`, purchaseId);
                const purchaseDoc = await transaction.get(purchaseRef);
                if (!purchaseDoc.exists()) throw "Purchase not found!";
                const purchaseData = purchaseDoc.data();
                 if (purchaseData.status !== 'pending') throw "This purchase has already been processed.";


                if (isApproved) {
                    const userRef = doc(db, `artifacts/${appId}/public/data/users`, purchaseData.userId);
                    
                    const itemRefs = purchaseData.items.map(item => doc(db, `artifacts/${appId}/public/data/inventory`, item.id));
                    const docs = await Promise.all([
                        transaction.get(userRef),
                        ...itemRefs.map(ref => transaction.get(ref))
                    ]);

                    const userDoc = docs[0];
                    const itemDocs = docs.slice(1);

                    if (!userDoc.exists()) throw "User not found!";
                    const userData = userDoc.data();

                    if(userData.points < purchaseData.totalCost) throw "Insufficient points.";

                    for (let i = 0; i < itemDocs.length; i++) {
                        const itemDoc = itemDocs[i];
                        const purchasedItem = purchaseData.items[i];
                        if (!itemDoc.exists() || itemDoc.data().stock < purchasedItem.quantity) {
                            throw `Insufficient stock for ${purchasedItem.name}.`;
                        }
                    }
                    
                    transaction.update(userRef, { points: userData.points - purchaseData.totalCost });

                    for (let i = 0; i < itemDocs.length; i++) {
                        const itemRef = itemRefs[i];
                        const itemDoc = itemDocs[i];
                        const purchasedItem = purchaseData.items[i];
                        transaction.update(itemRef, { stock: itemDoc.data().stock - purchasedItem.quantity });
                    }
                }
                
                transaction.update(purchaseRef, { status: isApproved ? 'approved' : 'rejected' });
            });
            showNotification(`Purchase ${isApproved ? 'approved' : 'rejected'} successfully.`, 'success');
        } catch (error) {
            console.error("Transaction failed: ", error);
            showNotification(`Error: ${error.toString()}`, 'error');
        }
    },
    resetPassword: async (userId) => {
        setDeletingState({ type: 'reset-password', id: userId });
        try {
            const userRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
            await updateDoc(userRef, {
                password: "password",
                forcePasswordChange: true,
            });
            showNotification("Password has been reset.", 'success');
        } catch(error) {
            console.error("Error resetting password:", error);
            showNotification(`Failed to reset password: ${error.message}`, 'error');
        } finally {
            setDeletingState({ type: null, id: null });
        }
    }
  };

  if (isLoading || !isAuthReady) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-700">
            <Loader2 className="animate-spin h-12 w-12 mr-3" />
            <span className="text-xl">Loading Pinnacle Perks...</span>
        </div>
    );
  }

  if (loggedInUser?.forcePasswordChange) {
      return (
        <AppContext.Provider value={contextValue}>
          <div className="bg-gray-100 min-h-screen font-sans">
              <Notification />
              <ChangePasswordPage isForced={true} />
          </div>
      </AppContext.Provider>
      )
  }

  if (!loggedInUser) {
    return (
      <AppContext.Provider value={contextValue}>
          <div className="bg-gray-100 min-h-screen font-sans">
              <Notification />
              <Login />
          </div>
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div className="bg-gray-100 min-h-screen font-sans">
        <Notification />
        <Modal />
        <Navbar />
        <InflationBar />
        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {currentPage === 'store' && <StorePage />}
          {currentPage === 'cart' && <CartPage />}
          {currentPage === 'profile' && <ProfilePage />}
          {currentPage === 'change-password' && <ChangePasswordPage />}
          {isAdmin && currentPage === 'admin/inventory' && <InventoryManagement />}
          {isAdmin && currentPage === 'admin/employees' && <EmployeeManagement />}
          {isAdmin && currentPage === 'admin/approvals' && <ApprovalQueue />}
          {isAdmin && currentPage === 'admin/settings' && <SettingsPage />}
        </main>
        <Footer />
      </div>
    </AppContext.Provider>
  );
}

// --- Reusable Components ---
const Modal = (props) => {
    const { modal, closeModal } = useContext(AppContext);
    if (!modal || !modal.isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">{modal.title}</h2>
                <div className="text-gray-600 mb-6">{modal.content}</div>
                <div className="flex justify-end gap-4">
                    <button onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            if(modal.onConfirm) modal.onConfirm();
                            closeModal();
                        }} 
                        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

const TermsPopup = ({ onAgree }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md text-center transform transition-all animate-fade-in-up">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Terms and Conditions</h2>
        <p className="text-gray-600 mb-6 text-base">
          By entering this store, I am agreeing to the{' '}
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLScFpQruqzSOYj6Yl6XmH_93C-63BtUkWVyg9EM9Nuc_nGx6XQ/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-500 hover:text-orange-700 underline font-medium"
          >
            Terms and Conditions
          </a>.
        </p>
        <button
          onClick={onAgree}
          className="w-full bg-orange-500 text-white font-bold py-2 px-4 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
        >
          I Agree & Continue
        </button>
      </div>
    </div>
  );
};


const Login = (props) => {
  const { handleLogin } = useContext(AppContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hasAgreed, setHasAgreed] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hasAgreed) return;
    handleLogin(username, password);
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      {!hasAgreed && <TermsPopup onAgree={() => setHasAgreed(true)} />}

      <div className={`w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg transition-filter duration-300 ${!hasAgreed ? 'filter blur-sm pointer-events-none' : ''}`}>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-orange-500">Pinnacle Perks</h1>
          <p className="mt-2 text-gray-600">Employee Store Login</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input 
                id="username" name="username" type="text" required 
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <input 
                id="password" name="password" type="password" required 
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div>
            <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors">
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Notification = (props) => {
    const { notification } = useContext(AppContext);

    if (!notification) return null;

    const typeStyles = { 
        success: 'bg-green-500', 
        error: 'bg-red-500', 
        info: 'bg-blue-500' 
    };

    return (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-lg shadow-lg text-white max-w-sm flex items-center transition-opacity duration-300 ${notification.show ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${typeStyles[notification.type] || 'bg-gray-500'}`}>
             {notification.type === 'success' && <CheckCircle className="mr-3" />}
             {notification.type === 'error' && <XCircle className="mr-3" />}
             {notification.type === 'info' && <Icon size={20} className="mr-3"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></Icon>}
             {notification.message}
        </div>
    );
};

const Navbar = (props) => {
  const { loggedInUser, handleLogout, setCurrentPage, cart, isAdmin, pendingPurchasesCount } = useContext(AppContext);
  const cartItemCount = Object.values(cart).reduce((sum, q) => sum + q, 0);

  return (
    <header className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button onClick={() => setCurrentPage('store')} className="flex-shrink-0 text-2xl font-bold text-orange-500">
              Pinnacle Perks
            </button>
            <nav className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <button onClick={() => setCurrentPage('store')} className="text-gray-700 hover:bg-orange-500 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Store</button>
                <button onClick={() => setCurrentPage('profile')} className="text-gray-700 hover:bg-orange-500 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Profile</button>
                {isAdmin && (
                  <>
                    <button onClick={() => setCurrentPage('admin/inventory')} className="text-gray-700 hover:bg-orange-500 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Inventory</button>
                    <button onClick={() => setCurrentPage('admin/employees')} className="text-gray-700 hover:bg-orange-500 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Employees</button>
                    <button onClick={() => setCurrentPage('admin/approvals')} className="relative text-gray-700 hover:bg-orange-500 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      Approvals
                      {pendingPurchasesCount > 0 && <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white rounded-full h-5 w-5 text-xs flex items-center justify-center">{pendingPurchasesCount}</span>}
                    </button>
                    <button onClick={() => setCurrentPage('admin/settings')} className="text-gray-700 hover:bg-orange-500 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"><Settings size={18}/></button>
                  </>
                )}
              </div>
            </nav>
          </div>
          <div className="flex items-center">
             <div className="mr-4 text-sm text-gray-700 hidden sm:block">
               <span className="font-semibold">{loggedInUser.points.toLocaleString()}</span>
               <span className="text-orange-500"> Pinn Points</span>
             </div>
             <button onClick={() => setCurrentPage('cart')} className="relative mr-4 p-2 rounded-full text-gray-600 hover:text-orange-500 hover:bg-gray-100 focus:outline-none transition-colors">
               <ShoppingCart/>
               {cartItemCount > 0 && <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-orange-500 text-white rounded-full h-5 w-5 text-xs flex items-center justify-center">{cartItemCount}</span>}
             </button>
            <div className="flex items-center ml-2">
              <img className="h-8 w-8 rounded-full object-cover" src={loggedInUser.pictureUrl} alt={loggedInUser.username} onError={(e) => { e.target.onerror = null; e.target.src=`https://placehold.co/100x100/CCCCCC/FFFFFF?text=Err`; }}/>
              <span className="ml-2 text-gray-700 text-sm font-medium hidden md:block">{loggedInUser.employeeName || loggedInUser.username}</span>
            </div>
            <button onClick={handleLogout} className="ml-4 p-2 rounded-full text-gray-600 hover:text-orange-500 hover:bg-gray-100 focus:outline-none transition-colors">
              <LogOut size={20}/>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

const InflationBar = () => {
    const { inflation, loggedInUser } = useContext(AppContext);
    if (!loggedInUser || !inflation || loggedInUser.role === 'admin') return null;
    
    const userDepartments = loggedInUser?.departments?.length ? loggedInUser.departments : ['Unassigned'];
    const inflationRates = userDepartments.map(dept => {
      const key = dept.toLowerCase().replace(/ /g, '');
      return inflation[key] ?? inflation.unassigned ?? 0;
    });
    const userInflation = Math.max(...inflationRates);

    if (userInflation === 0) return null;
    
    const color = userInflation > 0 ? 'bg-red-500' : 'bg-green-500';
    const text = userInflation > 0 
        ? `Inflation Alert: An inflation rate of ${userInflation}% is being applied based on your department.` 
        : `Deflation: A rate of ${Math.abs(userInflation)}% is being applied based on your department.`;

    return (
        <div className={`w-full p-2 text-center text-white text-sm font-semibold ${color}`}>
            {text}
        </div>
    );
};


const PriceDisplay = ({ item, checkoutUser }) => {
    const { calculateItemPrice, loggedInUser } = useContext(AppContext);
    const userForPrice = checkoutUser || loggedInUser;
    const finalPrice = calculateItemPrice(item, userForPrice);

    return (
        <div>
            {finalPrice !== item.price ? (
                <div className="flex items-baseline gap-2">
                    <p className="text-gray-500 line-through text-sm">{item.price.toLocaleString()} PP</p>
                    <p className="text-lg font-bold text-orange-500">{finalPrice.toLocaleString()} <span className="text-sm font-normal">PP</span></p>
                </div>
            ) : (
                <p className="text-lg font-bold text-orange-500">{finalPrice.toLocaleString()} <span className="text-sm font-normal">PP</span></p>
            )}
        </div>
    );
};


const StorePage = (props) => {
    const { inventory, addToCart } = useContext(AppContext);
    const [sortKey, setSortKey] = useState('name');

    const sortedInventory = useMemo(() => {
        const sorted = [...inventory.filter(item => item.stock > 0)];
        if (sortKey === 'name') {
            sorted.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortKey === 'price') {
            sorted.sort((a, b) => a.price - b.price);
        } else if (sortKey === 'stock') {
            sorted.sort((a, b) => a.stock - b.stock);
        }
        return sorted;
    }, [inventory, sortKey]);

    const SortButton = ({ value, label }) => (
        <button
            onClick={() => setSortKey(value)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${sortKey === value ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
                 <Leaderboard />
            </div>
            <div className="lg:col-span-3">
                <div className="flex justify-between items-center mb-6">
                     <h1 className="text-3xl font-bold text-gray-800">Welcome to the Store</h1>
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Sort by:</span>
                        <SortButton value="name" label="Name" />
                        <SortButton value="price" label="Price" />
                        <SortButton value="stock" label="Stock" />
                     </div>
                </div>
                {sortedInventory.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {sortedInventory.map(item => (
                            <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 flex flex-col">
                                <div className="relative">
                                    <img className="w-full h-48 object-cover" src={item.pictureUrl} alt={item.name} onError={(e) => { e.target.onerror = null; e.target.src=`https://placehold.co/300x300/F5F5F5/4A4A4A?text=Image+Error`; }}/>
                                    {item.discount > 0 && <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">{item.discount}% OFF</div>}
                                </div>
                                <div className="p-4 flex flex-col flex-grow">
                                    <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
                                    <p className="text-sm text-gray-600 mt-1 flex-grow">{item.description}</p>
                                    <div className="mt-4">
                                        <PriceDisplay item={item} />
                                        <p className="text-xs text-gray-500">{item.stock} left in stock</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50">
                                    <button onClick={() => addToCart(item.id)} className="w-full bg-orange-500 text-white font-bold py-2 px-4 rounded-md hover:bg-orange-600 transition-colors">
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-10">The store is currently empty. Check back later!</p>
                )}
            </div>
        </div>
    );
};

const CartPage = (props) => {
    const { cart, inventory, calculateItemPrice, updateCartQuantity, handlePurchaseRequest, isAdmin, users, loggedInUser } = useContext(AppContext);
    const [checkoutForUserId, setCheckoutForUserId] = useState(loggedInUser.id);
    
    const checkoutUser = users.find(u => u.id === checkoutForUserId) || loggedInUser;
    const userDiscount = checkoutUser.globalDiscount || 0;

    const cartItems = Object.entries(cart).map(([itemId, quantity]) => {
        const item = inventory.find(i => i.id === itemId);
        if (!item) return null;
        return { ...item, quantity, finalPrice: calculateItemPrice(item, checkoutUser) };
    }).filter(Boolean);

    const subtotal = cartItems.reduce((acc, item) => acc + item.finalPrice * item.quantity, 0);
    const discountAmount = Math.round(subtotal * (userDiscount / 100));
    const total = subtotal - discountAmount;
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Cart</h1>
            {cartItems.length === 0 ? <p className="text-gray-600">Your cart is empty.</p> : (
                <div>
                    <div className="space-y-4">
                        {cartItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between border-b pb-4">
                                <div className="flex items-center">
                                  <img src={item.pictureUrl} alt={item.name} className="h-20 w-20 rounded-md object-cover mr-4" />
                                  <div>
                                    <h3 className="font-semibold text-lg">{item.name}</h3>
                                    <PriceDisplay item={item} checkoutUser={checkoutUser} />
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center border rounded-md">
                                        <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)} className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-l-md"><MinusCircle size={16}/></button>
                                        <span className="px-4 py-1 font-semibold">{item.quantity}</span>
                                        <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)} className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-r-md"><PlusCircle size={16}/></button>
                                    </div>
                                    <p className="font-semibold w-24 text-right">{(item.finalPrice * item.quantity).toLocaleString()} PP</p>
                                    <button onClick={() => updateCartQuantity(item.id, 0)} className="text-red-500 hover:text-red-700"><XCircle size={20}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 text-right space-y-2">
                        <p className="text-xl">Subtotal: {subtotal.toLocaleString()} PP</p>
                        {userDiscount > 0 && <p className="text-lg text-green-600">Employee Discount ({userDiscount}%): -{discountAmount.toLocaleString()} PP</p>}
                        <p className="text-2xl font-bold">Total: {total.toLocaleString()} PP</p>
                        {isAdmin && (
                            <div className="mt-4 flex justify-end items-center gap-2">
                                <label htmlFor="checkoutUser" className="text-sm font-medium">Checkout for Employee:</label>
                                <select id="checkoutUser" value={checkoutForUserId} onChange={e => setCheckoutForUserId(e.target.value)} className="p-2 border rounded-md">
                                    <option value={loggedInUser.id}>Myself (admin)</option>
                                    {users.filter(u => u.role === 'employee').sort((a,b) => (a.employeeName || a.username).localeCompare(b.employeeName || b.username)).map(u => <option key={u.id} value={u.id}>{u.employeeName || u.username}</option>)}
                                </select>
                            </div>
                        )}
                        <button onClick={() => handlePurchaseRequest(checkoutForUserId)} className="mt-4 bg-orange-500 text-white font-bold py-3 px-8 rounded-md hover:bg-orange-600 transition-colors">
                            {isAdmin && checkoutForUserId !== loggedInUser.id ? `Checkout for ${checkoutUser.employeeName}` : `Request Purchase`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ProfilePage = () => {
    const { loggedInUser, updateUser, purchases, pointHistory, showNotification, setCurrentPage } = useContext(AppContext);
    const fileInputRef = useRef(null);

    const handlePictureChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateUser({ ...loggedInUser, pictureUrl: reader.result }, loggedInUser);
                showNotification('Profile picture updated!', 'success');
            };
            reader.readAsDataURL(file);
        } else {
            showNotification('Please select a valid image file.', 'error');
        }
    };

    const combinedHistory = useMemo(() => {
        const purchaseHistory = purchases
            .filter(p => p.userId === loggedInUser.id && p.status === 'approved')
            .map(p => ({ type: 'purchase', date: new Date(p.date), data: p }));

        const pointsHistoryFormatted = pointHistory
            .filter(h => h.userId === loggedInUser.id)
            .map(h => ({ type: 'points', date: new Date(h.date), data: h }));
            
        return [...purchaseHistory, ...pointsHistoryFormatted].sort((a, b) => b.date - a.date);
    }, [purchases, pointHistory, loggedInUser.id]);


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg flex flex-col items-center text-center">
                <div className="relative group">
                    <img src={loggedInUser.pictureUrl} alt="Profile" className="h-40 w-40 rounded-full object-cover border-4 border-orange-500" onError={(e) => { e.target.onerror = null; e.target.src=`https://placehold.co/100x100/CCCCCC/FFFFFF?text=Error`; }}/>
                    <button onClick={() => fileInputRef.current.click()} className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={40} />
                    </button>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePictureChange} className="hidden" />
                </div>
                <h2 className="mt-4 text-3xl font-bold">{loggedInUser.employeeName || loggedInUser.username}</h2>
                <p className="text-gray-500">@{loggedInUser.username} | <span className="capitalize">{loggedInUser.role}</span></p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {(loggedInUser.departments && loggedInUser.departments.length > 0) ? loggedInUser.departments.map(dept => (
                        <span key={dept} className="text-sm font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">{dept}</span>
                    )) : <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">Unassigned</span>}
                </div>
                {loggedInUser.globalDiscount > 0 && <p className="mt-2 text-sm font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full">{loggedInUser.globalDiscount}% Global Discount</p>}
                <div className="mt-6 bg-orange-100 text-orange-700 p-4 rounded-lg text-center w-full">
                    <p className="text-lg">Available Balance</p>
                    <p className="text-4xl font-bold">{loggedInUser.points.toLocaleString()} PP</p>
                </div>
                 <button onClick={() => setCurrentPage('change-password')} className="mt-6 bg-orange-500 text-white font-bold py-2 px-4 rounded-md hover:bg-orange-600 transition-colors">
                    Change Password
                </button>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-2xl font-bold mb-4">Activity History</h3>
                {combinedHistory.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {combinedHistory.map((entry, index) => (
                            <div key={`${entry.type}-${entry.data.id}-${index}`} className="border p-4 rounded-lg bg-gray-50">
                                {entry.type === 'purchase' ? (
                                    <>
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="font-semibold text-gray-700">Order from {new Date(entry.data.date).toLocaleDateString()}</p>
                                            <p className="font-bold text-lg text-orange-500">-{entry.data.totalCost.toLocaleString()} PP</p>
                                        </div>
                                        <ul className="list-disc list-inside text-sm text-gray-600">
                                            {entry.data.items.map(item => <li key={item.id}>{item.name} (x{item.quantity}) @ {item.purchasePrice.toLocaleString()} PP each</li>)}
                                        </ul>
                                    </>
                                ) : (
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-gray-700">
                                                {entry.data.pointsAdded > 0 ? 'Points Added' : 'Points Deducted'}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                On {entry.date.toLocaleDateString()}
                                            </p>
                                        </div>
                                        <p className={`font-bold text-lg ${entry.data.pointsAdded > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {entry.data.pointsAdded > 0 ? '+' : ''}{entry.data.pointsAdded.toLocaleString()} PP
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : <p className="text-gray-500">No activity yet.</p>}
            </div>
        </div>
    );
};

const Leaderboard = () => {
    const { users } = useContext(AppContext);
    const topEmployees = [...users].filter(u => u.role === 'employee').sort((a, b) => b.points - a.points).slice(0, 10);

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg h-full">
            <h3 className="text-2xl font-bold mb-4 flex items-center"><BarChart2 className="mr-2 text-orange-500"/> Top 10 Employees by Points</h3>
            <ol className="space-y-3">
                {topEmployees.map((user, index) => (
                    <li key={user.id} className="flex items-center justify-between p-2 rounded-md transition-colors hover:bg-gray-50">
                        <div className="flex items-center">
                            <span className="font-bold text-lg w-8 text-gray-500">{index + 1}.</span>
                            <img src={user.pictureUrl} alt={user.username} className="h-10 w-10 rounded-full object-cover mr-3" />
                            <span className="font-medium">{user.employeeName || user.username}</span>
                        </div>
                        <span className="font-bold text-orange-500">{user.points.toLocaleString()} PP</span>
                    </li>
                ))}
            </ol>
        </div>
    );
};

const AdminPageContainer = ({ title, icon, children }) => (
    <div className="bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">{icon} {title}</h1>
        {children}
    </div>
);

const InventoryManagement = () => {
    const { inventory, updateItem, addItem, deleteItem, showModal, showNotification, handleCSVUpload, isUploading, deletingState } = useContext(AppContext);
    const [editingItem, setEditingItem] = useState(null);

    const handleSave = () => {
        updateItem(editingItem);
        setEditingItem(null);
    };

    const handleAddNewItem = () => {
      const newItemId = `item-${Date.now()}`;
      const newItem = { id: newItemId, name: 'New Item', description: 'New Description', price: 100, stock: 10, discount: 0, pictureUrl: 'https://placehold.co/300x300/F5F5F5/4A4A4A?text=New' };
      addItem(newItem);
      setEditingItem(newItem);
    };
    
    const handleDelete = (itemId, itemName) => {
        showModal(
            'Delete Item', 
            <span>Are you sure you want to delete <strong>"{itemName}"</strong>? This action cannot be undone.</span>, 
            () => deleteItem(itemId, itemName)
        );
    };

    const handlePictureChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditingItem(prev => ({...prev, pictureUrl: reader.result}));
            };
            reader.readAsDataURL(file);
        } else {
            showNotification('Please select a valid image file.', 'error');
        }
    };
    
    const downloadCSVTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8," + "id,name,description,price,stock,discount,pictureUrl\n";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "inventory_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const onFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleCSVUpload(file, INVENTORY_UPLOAD_URL);
        }
        e.target.value = null; // Reset file input
    };

    return (
        <AdminPageContainer title="Inventory Management" icon={<Box className="mr-3"/>}>
            <div className="mb-4 flex items-center gap-4 flex-wrap">
                <button onClick={handleAddNewItem} disabled={isUploading} className="bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 flex items-center disabled:bg-gray-400"><PlusCircle size={18} className="mr-2"/>Add New Item</button>
                <button onClick={downloadCSVTemplate} disabled={isUploading} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors flex items-center disabled:bg-gray-400"><Download size={18} className="mr-2"/>Download Template</button>
                <label className={`bg-yellow-500 text-white font-bold py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors flex items-center cursor-pointer ${isUploading ? 'bg-gray-400 cursor-not-allowed' : ''}`}>
                    {isUploading ? <Loader2 size={18} className="mr-2 animate-spin"/> : <Upload size={18} className="mr-2"/>}
                    {isUploading ? 'Uploading...' : 'Upload CSV'}
                    <input type="file" accept=".csv" onChange={onFileSelect} disabled={isUploading} className="hidden" />
                </label>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr><th className="px-6 py-3">Item</th><th className="px-6 py-3">Description</th><th className="px-6 py-3">Price</th><th className="px-6 py-3">Stock</th><th className="px-6 py-3">Discount</th><th className="px-6 py-3">Actions</th></tr>
                    </thead>
                    <tbody>
                        {inventory.map(item => editingItem?.id === item.id ? (
                            <tr key={item.id} className="bg-yellow-50">
                                <td className="px-6 py-4">
                                    <div className="relative group w-24 h-24 mb-2">
                                        <img src={editingItem.pictureUrl} alt="item" className="w-24 h-24 object-cover rounded-md"/>
                                        <label className="absolute inset-0 bg-black bg-opacity-50 rounded-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <Camera size={24}/><input type="file" accept="image/*" onChange={handlePictureChange} className="hidden" />
                                        </label>
                                    </div>
                                    <input type="text" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="p-1 border rounded-md w-full" />
                                </td>
                                <td className="px-6 py-4"><textarea value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} className="p-1 border rounded-md w-full" rows="3"></textarea></td>
                                <td className="px-6 py-4"><input type="number" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: Number(e.target.value)})} className="p-1 border rounded-md w-24" /></td>
                                <td className="px-6 py-4"><input type="number" value={editingItem.stock} onChange={e => setEditingItem({...editingItem, stock: Number(e.target.value)})} className="p-1 border rounded-md w-20" /></td>
                                <td className="px-6 py-4"><input type="number" value={editingItem.discount} onChange={e => setEditingItem({...editingItem, discount: Number(e.target.value)})} className="p-1 border rounded-md w-20" /></td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <button onClick={handleSave} className="p-2 text-green-600 hover:text-green-800"><Save size={20}/></button>
                                    <button onClick={() => setEditingItem(null)} className="p-2 text-gray-600 hover:text-gray-800"><X size={20}/></button>
                                </td>
                            </tr>
                        ) : (
                            <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 flex items-center gap-4"><img src={item.pictureUrl} alt={item.name} className="w-16 h-16 object-cover rounded-md"/><div><div className="font-medium text-gray-900">{item.name}</div></div></td>
                                <td className="px-6 py-4 text-xs text-gray-500 max-w-sm truncate">{item.description}</td>
                                <td className="px-6 py-4">{item.price.toLocaleString()}</td><td className="px-6 py-4">{item.stock}</td>
                                <td className="px-6 py-4">{item.discount || 0}%</td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <button onClick={() => setEditingItem({...item})} className="p-2 text-blue-600 hover:text-blue-800"><Edit size={20}/></button>
                                    <button onClick={() => handleDelete(item.id, item.name)} className="p-2 text-red-600 hover:text-red-800" disabled={deletingState.id === item.id}>
                                        {deletingState.id === item.id ? <Loader2 className="animate-spin" size={20}/> : <XCircle size={20}/>}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminPageContainer>
    );
};

const EmployeeManagement = () => {
    const { users, updateUser, addUser, deleteUser, showModal, showNotification, handleCSVUpload, isUploading, deletingState, resetPassword } = useContext(AppContext);
    const [editingUser, setEditingUser] = useState(null);
    const [pointsToAdd, setPointsToAdd] = useState({});
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [sortConfig, setSortConfig] = useState({ key: 'employeeName', direction: 'ascending' });

    const handleDepartmentChange = (user, department, isChecked) => {
        const currentDepts = new Set(user.departments?.filter(d => d !== 'Unassigned'));
        if (isChecked) {
            currentDepts.add(department);
        } else {
            currentDepts.delete(department);
        }
        
        const newDepartments = Array.from(currentDepts);
        const updatedUser = {
            ...user,
            departments: newDepartments.length > 0 ? newDepartments : ['Unassigned']
        };
        updateUser(updatedUser, user);
    };

    const sortedUsers = useMemo(() => {
        let sortableUsers = [...users];
        if (sortConfig.key) {
            sortableUsers.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'employeeName') {
                    aValue = a.employeeName || a.username;
                    bValue = b.employeeName || b.username;
                }

                if (sortConfig.key === 'departments') {
                    aValue = (a.departments || []).join(', ');
                    bValue = (b.departments || []).join(', ');
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableUsers;
    }, [users, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const handleAddNewUser = () => {
        const newUser = { 
            username: `new.user.${Date.now()}`.slice(-15), 
            employeeName: 'New User',
            password: 'password123', 
            role: 'employee', 
            points: 0, 
            globalDiscount: 0,
            departments: ['Unassigned'],
            pictureUrl: `https://placehold.co/100x100/4A90E2/FFFFFF?text=N`,
            forcePasswordChange: true
        };
        addUser(newUser);
        showNotification(`New user "${newUser.username}" created.`, 'success');
    };
    
    const handleToggleUserSelection = (userId) => {
        setSelectedUsers(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(userId)) {
                newSelection.delete(userId);
            } else {
                newSelection.add(userId);
            }
            return newSelection;
        });
    };

    const handleDeleteSelected = () => {
        const usersToDelete = Array.from(selectedUsers);
        if(usersToDelete.length === 0) {
            showNotification("No users selected.", "info");
            return;
        }

        showModal(
            `Delete ${usersToDelete.length} User(s)`,
            `Are you sure you want to delete ${usersToDelete.length} selected employee(s)? This action cannot be undone.`,
            async () => {
                const batch = writeBatch(db);
                usersToDelete.forEach(userId => {
                    batch.delete(doc(db, `artifacts/${appId}/public/data/users`, userId));
                });
                await batch.commit();
                showNotification(`${usersToDelete.length} user(s) deleted.`, "info");
                setSelectedUsers(new Set());
            }
        );
    };

    const downloadEmployeesCSVTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8," + "username,employeeName,password,role,points,globalDiscount,departments,pictureUrl\n";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "employees_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const downloadPointsCSVTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8," + "username,points_to_add\n";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "points_update_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const onEmployeesFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) handleCSVUpload(file, EMPLOYEES_UPLOAD_URL);
        e.target.value = null;
    };
    
    const onPointsFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) handleCSVUpload(file, POINTS_UPLOAD_URL);
        e.target.value = null;
    };
    
    const handleResetPassword = (user) => {
        showModal(
            'Reset Password',
            `Are you sure you want to reset the password for ${user.employeeName || user.username}?`,
            () => resetPassword(user.id)
        );
    };


    return (
        <AdminPageContainer title="Employee Management" icon={<Users className="mr-3"/>}>
             <div className="mb-4 flex items-center gap-4 flex-wrap">
                <button onClick={handleAddNewUser} disabled={isUploading} className="bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 flex items-center disabled:bg-gray-400"><UserPlus size={18} className="mr-2"/>Add Employee</button>
                <button onClick={downloadEmployeesCSVTemplate} disabled={isUploading} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors flex items-center disabled:bg-gray-400"><Download size={18} className="mr-2"/>Download Employees</button>
                <label className={`bg-yellow-500 text-white font-bold py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors flex items-center cursor-pointer ${isUploading ? 'bg-gray-400 cursor-not-allowed' : ''}`}>
                    {isUploading ? <Loader2 size={18} className="mr-2 animate-spin"/> : <Upload size={18} className="mr-2"/>}
                    {isUploading ? 'Uploading...' : 'Upload Employees'}
                    <input type="file" accept=".csv" onChange={onEmployeesFileSelect} disabled={isUploading} className="hidden" />
                </label>
                 <button onClick={downloadPointsCSVTemplate} disabled={isUploading} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors flex items-center disabled:bg-gray-400"><Download size={18} className="mr-2"/>Download Points Template</button>
                <label className={`bg-yellow-500 text-white font-bold py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors flex items-center cursor-pointer ${isUploading ? 'bg-gray-400 cursor-not-allowed' : ''}`}>
                    {isUploading ? <Loader2 size={18} className="mr-2 animate-spin"/> : <Upload size={18} className="mr-2"/>}
                    {isUploading ? 'Uploading...' : 'Upload Points'}
                    <input type="file" accept=".csv" onChange={onPointsFileSelect} disabled={isUploading} className="hidden" />
                </label>
                {selectedUsers.size > 0 && (
                     <button onClick={handleDeleteSelected} disabled={isUploading} className="bg-red-600 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700 flex items-center disabled:bg-gray-400">
                        <XCircle size={18} className="mr-2"/>Delete Selected ({selectedUsers.size})
                    </button>
                )}
            </div>
            {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={(updated) => { updateUser(updated, editingUser); setEditingUser(null); }}/>}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                            <th className="px-6 py-3"></th>
                            <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort('employeeName')}>User</th>
                            <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort('departments')}>Department(s)</th>
                            <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort('points')}>Points</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedUsers.map(user => (
                            <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    {user.role !== 'admin' && (
                                        <input 
                                            type="checkbox"
                                            checked={selectedUsers.has(user.id)}
                                            onChange={() => handleToggleUserSelection(user.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                        />
                                    )}
                                </td>
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <img src={user.pictureUrl} alt={user.username} className="w-10 h-10 rounded-full object-cover"/>
                                    <div>
                                        <div className="font-medium">{user.employeeName || user.username}</div>
                                        <div className="text-xs text-gray-500">@{user.username}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col space-y-1">
                                    {DEPARTMENTS.map(dept => (
                                        <label key={dept} className="flex items-center space-x-2 text-xs">
                                            <input
                                                type="checkbox"
                                                checked={user.departments?.includes(dept)}
                                                onChange={(e) => handleDepartmentChange(user, dept, e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                            />
                                            <span>{dept}</span>
                                        </label>
                                    ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-semibold">{user.points.toLocaleString()}</td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <button onClick={() => setEditingUser(user)} className="p-2 text-blue-600 hover:text-blue-800"><Edit size={20}/></button>
                                    {user.role !== 'admin' && (
                                      <>
                                        <button onClick={() => handleResetPassword(user)} className="p-2 text-orange-600 hover:text-orange-800" title="Reset Password" disabled={deletingState.type === 'reset-password' && deletingState.id === user.id}>
                                            {deletingState.type === 'reset-password' && deletingState.id === user.id ? <Loader2 className="animate-spin" size={20}/> : <KeyRound size={20}/>}
                                        </button>
                                        <button onClick={() => deleteUser(user.id, user.employeeName || user.username)} className="p-2 text-red-600 hover:text-red-800" disabled={deletingState.type === 'user' && deletingState.id === user.id}>
                                            {deletingState.type === 'user' && deletingState.id === user.id ? <Loader2 className="animate-spin" size={20}/> : <XCircle size={20}/>}
                                        </button>
                                      </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminPageContainer>
    );
};

const EditUserModal = ({ user, onClose, onSave }) => {
    const [userData, setUserData] = useState(user);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setUserData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
    };

    const handleSave = () => {
        onSave(userData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h2 className="text-xl font-bold mb-4">Edit User: {user.employeeName}</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Employee Name</label>
                        <input type="text" name="employeeName" value={userData.employeeName} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input type="text" name="username" value={userData.username} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Points</label>
                        <input type="number" name="points" value={userData.points} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Global Discount (%)</label>
                        <input type="number" name="globalDiscount" value={userData.globalDiscount} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" />
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">Save Changes</button>
                </div>
            </div>
        </div>
    )
}

const ApprovalQueue = () => {
    const { purchases, handleApproval, users } = useContext(AppContext);
    const pendingPurchases = purchases.filter(p => p.status === 'pending');

    return (
        <AdminPageContainer title="Approval Queue" icon={<CheckCircle className="mr-3"/>}>
            {pendingPurchases.length === 0 ? <p>No pending approvals.</p> : (
                <div className="space-y-4">
                    {pendingPurchases.map(p => {
                        const user = users.find(u => u.id === p.userId);
                        return (
                            <div key={p.id} className="border rounded-lg p-4 shadow-sm bg-gray-50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-lg">{p.employeeName || p.username}</p>
                                        <p className="text-sm text-gray-500">On: {new Date(p.date).toLocaleString()}</p>
                                        <p className="text-sm text-gray-600 mt-1">Current Balance: <strong>{user?.points.toLocaleString() || 'N/A'} PP</strong></p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-xl text-orange-500">{p.totalCost.toLocaleString()} PP</p>
                                        <p className="text-sm text-gray-600 mt-1">Balance After: <strong>{((user?.points || 0) - p.totalCost).toLocaleString() || 'N/A'} PP</strong></p>
                                    </div>
                                </div>
                                <div className="mt-4 border-t pt-4"><p className="font-semibold mb-2">Items:</p>
                                    <ul className="space-y-2">
                                        {p.items.map(item => (
                                            <li key={item.id} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center"><img src={item.pictureUrl} alt={item.name} className="h-10 w-10 rounded-md object-cover mr-3"/><span>{item.name} (x{item.quantity})</span></div>
                                                <span>{(item.purchasePrice * item.quantity).toLocaleString()} PP</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="mt-4 flex justify-end gap-3">
                                    <button onClick={() => handleApproval(p.id, true)} className="bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 flex items-center"><CheckCircle size={18} className="mr-2"/>Approve</button>
                                    <button onClick={() => handleApproval(p.id, false)} className="bg-red-500 text-white font-bold py-2 px-4 rounded-md hover:bg-red-600 flex items-center"><XCircle size={18} className="mr-2"/>Reject</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </AdminPageContainer>
    );
};

const SettingsPage = () => {
    const { inflation, setInflation: setGlobalInflation, showNotification, showModal, deleteAllEmployees, deletingState } = useContext(AppContext);
    const [localInflation, setLocalInflation] = useState(inflation || {});

    useEffect(() => {
        setLocalInflation(inflation || {});
    }, [inflation]);

    const handleInflationChange = (department, value) => {
        const departmentKey = department.toLowerCase().replace(/ /g, '');
        setLocalInflation(prev => ({ ...prev, [departmentKey]: Number(value) }));
    };

    const handleSave = () => {
        setGlobalInflation(localInflation);
        showNotification('Settings saved successfully!', 'success');
    };
    
    const handleDeleteAllEmployees = () => {
        showModal(
            'Delete All Employees',
            <span>Are you sure you want to delete <strong>ALL</strong> non-admin employees? This action is irreversible.</span>,
            deleteAllEmployees
        );
    };

    const isDeletingAllEmployees = deletingState.type === 'all-employees';

    return (
        <AdminPageContainer title="Global Settings" icon={<Settings className="mr-3"/>}>
            <div className="space-y-8">
                <div className="p-6 border rounded-lg">
                    <h3 className="text-xl font-semibold mb-4">Department Inflation Rates</h3>
                    <p className="text-sm text-gray-600 mb-4">Set a specific inflation percentage for each department. Use a negative number for deflation.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...DEPARTMENTS, 'Unassigned'].map(dept => {
                            const deptKey = dept.toLowerCase().replace(/ /g, '');
                            return (
                                <div key={dept} className="flex items-center gap-4">
                                    <label className="w-40 font-medium">{dept}:</label>
                                    <input type="number" value={localInflation[deptKey] || 0} onChange={e => handleInflationChange(dept, e.target.value)} className="p-2 border rounded-md w-40"/>
                                    <span className="text-xl font-semibold">%</span>
                                </div>
                            )
                        })}
                    </div>
                     <div className="flex justify-end mt-6">
                        <button onClick={handleSave} className="bg-orange-500 text-white font-bold py-3 px-6 rounded-md hover:bg-orange-600 transition-colors">Save Inflation Settings</button>
                    </div>
                </div>

                <div className="p-6 border-2 border-red-500 rounded-lg space-y-4">
                    <h3 className="text-xl font-semibold text-red-700 mb-2">Danger Zone</h3>
                    <div>
                        <p className="text-sm text-gray-600 mb-2">This will permanently remove all users with the 'employee' role.</p>
                        <button 
                            onClick={handleDeleteAllEmployees} 
                            className="bg-red-600 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center w-48"
                            disabled={isDeletingAllEmployees}
                        >
                            {isDeletingAllEmployees ? <Loader2 className="animate-spin" /> : 'Delete All Employees'}
                        </button>
                    </div>
                </div>
            </div>
        </AdminPageContainer>
    );
};

const Footer = () => (
    <footer className="bg-gray-100 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Pinnacle Perks. A demonstration app.</p>
        </div>
    </footer>
);

const ChangePasswordPage = ({isForced = false}) => {
    const { updateUser, loggedInUser, showNotification, setCurrentPage } = useContext(AppContext);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            showNotification("Password must be at least 6 characters long.", "error");
            return;
        }
        if (password !== confirmPassword) {
            showNotification("Passwords do not match.", "error");
            return;
        }
        await updateUser({
            ...loggedInUser,
            password,
            forcePasswordChange: false,
        }, loggedInUser);
        showNotification("Password changed successfully!", "success");
        if(!isForced) {
            setCurrentPage('profile');
        }
    };
    
    const pageTitle = isForced ? "Create a New Password" : "Change Your Password";
    const pageSubTitle = isForced ? "For security, please create a new password." : "Enter a new password below.";


    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-orange-500">{pageTitle}</h1>
                    <p className="mt-2 text-gray-600">{pageSubTitle}</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                id="new-password"
                                name="new-password"
                                type="password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                                placeholder="New Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <input
                                id="confirm-password"
                                name="confirm-password"
                                type="password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors">
                            Set New Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export default App;
