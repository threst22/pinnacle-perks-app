import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { Camera, Upload, Download, X, Edit, Save, PlusCircle, MinusCircle, CheckCircle, XCircle, FileText, UserPlus, ShoppingCart, LogOut, Settings, Users, Box, BarChart2, Loader2 } from 'lucide-react';

// --- Firebase SDK Imports ---
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, writeBatch, runTransaction } from 'firebase/firestore';

// --- Firebase Configuration & Initialization ---
let app, auth, db;

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
    // The app will still render but Firebase-dependent features will be disabled.
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'pinnacle-perks-default';

// --- App Context for Global State Management ---
const AppContext = createContext(null);

// --- Initial Data Seeding Logic ---
const getInitialSeedData = () => {
  const initialUsers = [
    { id: 'admin-01', username: 'admin', password: '1nTu1tu53r', role: 'admin', points: 1000000, pictureUrl: `https://placehold.co/100x100/E9A47C/FFFFFF?text=A` },
    { id: 'emp-01', username: 'alice', password: 'password123', role: 'employee', points: 5000, pictureUrl: `https://placehold.co/100x100/4A90E2/FFFFFF?text=A` },
    { id: 'emp-02', username: 'bob', password: 'password123', role: 'employee', points: 7500, pictureUrl: `https://placehold.co/100x100/4A90E2/FFFFFF?text=B` },
  ];
  const initialInventory = [
    { id: 'item-01', name: 'Company Hoodie', description: 'Comfortable and stylish company branded hoodie.', price: 2500, stock: 50, pictureUrl: `https://placehold.co/300x300/F5F5F5/4A4A4A?text=Hoodie` },
    { id: 'item-02', name: 'Insulated Tumbler', description: 'Keeps your drinks hot or cold for hours.', price: 1200, stock: 100, pictureUrl: `https://placehold.co/300x300/F5F5F5/4A4A4A?text=Tumbler` },
    { id: 'item-03', name: 'Wireless Mouse', description: 'Ergonomic wireless mouse for your setup.', price: 1800, stock: 75, pictureUrl: `https://placehold.co/300x300/F5F5F5/4A4A4A?text=Mouse` },
  ];
  return { initialUsers, initialInventory };
};

const seedDataToFirestore = async () => {
    if (!db) return;
    console.log("Seeding initial data to Firestore...");
    const batch = writeBatch(db);
    const { initialUsers, initialInventory } = getInitialSeedData();

    // Seed config
    const configRef = doc(db, `artifacts/${appId}/public/data/config`, "global");
    batch.set(configRef, { inflation: 0, seeded: true });

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
};

// --- Main App Component ---
function App() {
  // --- State Management ---
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // App Data State
  const [users, setUsers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [inflation, setInflation] = useState(0);
  const [cart, setCart] = useState({});

  // UI State
  const [loggedInUser, setLoggedInUser] = useState(null); // Local app user profile
  const [currentPage, setCurrentPage] = useState('store');
  const [notification, setNotification] = useState({ message: '', type: '', show: false });
  const [modal, setModal] = useState({ isOpen: false, title: '', content: '', onConfirm: () => {} });

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
             // Use custom token if available, otherwise sign in anonymously
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
        if (!configSnap.exists()) {
            await seedDataToFirestore();
        }
    };
    
    checkAndSeedData().then(() => {
        // Global Config Listener
        const configRef = doc(db, `artifacts/${appId}/public/data/config`, "global");
        unsubscribers.push(onSnapshot(configRef, (doc) => {
            setInflation(doc.data()?.inflation || 0);
        }, (error) => console.error("Config listener error:", error)));

        // Users Listener
        const usersQuery = query(collection(db, `artifacts/${appId}/public/data/users`));
        unsubscribers.push(onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersData);
        }, (error) => console.error("Users listener error:", error)));

        // Inventory Listener
        const inventoryQuery = query(collection(db, `artifacts/${appId}/public/data/inventory`));
        unsubscribers.push(onSnapshot(inventoryQuery, (snapshot) => {
            const inventoryData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setInventory(inventoryData);
        }, (error) => console.error("Inventory listener error:", error)));

        // Purchases Listener
        const purchasesQuery = query(collection(db, `artifacts/${appId}/public/data/purchases`));
        unsubscribers.push(onSnapshot(purchasesQuery, (snapshot) => {
            const purchasesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPurchases(purchasesData);
        }, (error) => console.error("Purchases listener error:", error)));
        
        setIsLoading(false);
    }).catch(error => {
        console.error("Error during seeding check:", error);
        setIsLoading(false);
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, [isAuthReady]);

  // Cart Listener (depends on logged-in user)
  useEffect(() => {
    if (!loggedInUser || !firebaseUser || !db) {
        setCart({});
        return;
    };

    const cartRef = doc(db, `artifacts/${appId}/users/${firebaseUser.uid}/cart`, 'current');
    const unsubscribe = onSnapshot(cartRef, (doc) => {
        setCart(doc.data()?.items || {});
    }, (error) => console.error("Cart listener error:", error));

    return () => unsubscribe();
  }, [loggedInUser, firebaseUser]);
  
  // --- UI Functions ---
  const showNotification = useCallback((message, type = 'success', duration = 3000) => {
    setNotification({ message, type, show: true });
    setTimeout(() => {
      setNotification({ message: '', type: '', show: false });
    }, duration);
  }, []);
  
  const handleLogout = useCallback(() => {
    setLoggedInUser(null);
    setCurrentPage('store');
    showNotification('You have been logged out.', 'info');
  }, [showNotification]);

  // This effect syncs the local loggedInUser state with the real-time user data from Firestore.
  // This ensures that updates (like a picture change) are reflected immediately.
  useEffect(() => {
    if (loggedInUser && users.length > 0) {
        const currentUserData = users.find(u => u.id === loggedInUser.id);
        if (currentUserData) {
            // Use JSON.stringify for a simple but effective deep comparison to prevent unnecessary re-renders
            if (JSON.stringify(currentUserData) !== JSON.stringify(loggedInUser)) {
                setLoggedInUser(currentUserData);
            }
        } else {
            // User was deleted from another client, so log them out.
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

  // --- Core App Functions (with Firestore integration) ---
  const handleLogin = (username, password) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setLoggedInUser(user);
      showNotification(`Welcome back, ${user.username}!`, 'success');
      setCurrentPage('store');
    } else {
      showNotification('Invalid username or password.', 'error');
    }
  };
  
  const getPriceWithInflation = (price) => Math.round(price * (1 + inflation / 100));
  
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
      const userCart = checkoutUserId === loggedInUser.id ? cart : {}; // Simplified for now
      
      if (Object.keys(userCart).length === 0) {
          showNotification('Cart is empty.', 'error');
          return;
      }
      
      const purchaseItems = Object.entries(userCart).map(([itemId, quantity]) => {
          const item = inventory.find(i => i.id === itemId);
          return {
              id: item.id, name: item.name, originalPrice: item.price,
              purchasePrice: getPriceWithInflation(item.price), quantity, pictureUrl: item.pictureUrl
          };
      });
      
      const totalCost = purchaseItems.reduce((acc, item) => acc + item.purchasePrice * item.quantity, 0);

      if (user.points < totalCost) {
          showNotification(`Not enough Pinn Points. Required: ${totalCost}, Available: ${user.points}`, 'error');
          return;
      }

      const newPurchase = {
          userId: user.id, username: user.username, items: purchaseItems, totalCost,
          date: new Date().toISOString(), status: 'pending',
      };
      
      await addDoc(collection(db, `artifacts/${appId}/public/data/purchases`), newPurchase);
      await updateCartInFirestore({}); // Clear cart after request
      
      showNotification('Purchase request submitted for approval!', 'success');
      setCurrentPage('store');
  };

  // --- Context Provider Value ---
  const contextValue = {
    users, inventory, purchases, inflation, cart, firebaseUser,
    loggedInUser, currentPage, setCurrentPage,
    isAdmin, pendingPurchasesCount,
    notification, modal, // Pass state for notification and modal
    showNotification, handleLogin, handleLogout, getPriceWithInflation, addToCart, updateCartQuantity, handlePurchaseRequest,
    showModal, closeModal,
    // Firestore specific setters
    setInflation: async (newInflation) => {
        const configRef = doc(db, `artifacts/${appId}/public/data/config`, "global");
        await updateDoc(configRef, { inflation: newInflation });
    },
    updateUser: async (userToUpdate) => {
        const userRef = doc(db, `artifacts/${appId}/public/data/users`, userToUpdate.id);
        await updateDoc(userRef, userToUpdate);
    },
    addUser: async (newUser) => {
        const docRef = await addDoc(collection(db, `artifacts/${appId}/public/data/users`), newUser);
        await updateDoc(docRef, { id: docRef.id }); // Add the auto-ID back to the document
    },
    deleteUser: async (userId) => {
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/users`, userId));
    },
    updateItem: async (itemToUpdate) => {
        const itemRef = doc(db, `artifacts/${appId}/public/data/inventory`, itemToUpdate.id);
        await updateDoc(itemRef, itemToUpdate);
    },
    addItem: async (newItem) => {
        const itemRef = doc(db, `artifacts/${appId}/public/data/inventory`, newItem.id);
        await setDoc(itemRef, newItem);
    },
    deleteItem: async (itemId) => {
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/inventory`, itemId));
    },
    handleApproval: async (purchaseId, isApproved) => {
        try {
            await runTransaction(db, async (transaction) => {
                const purchaseRef = doc(db, `artifacts/${appId}/public/data/purchases`, purchaseId);
                const purchaseDoc = await transaction.get(purchaseRef);
                if (!purchaseDoc.exists()) throw "Purchase not found!";
                const purchaseData = purchaseDoc.data();

                if (isApproved) {
                    const userRef = doc(db, `artifacts/${appId}/public/data/users`, purchaseData.userId);
                    const userDoc = await transaction.get(userRef);
                    if (!userDoc.exists()) throw "User not found!";
                    const userData = userDoc.data();

                    if(userData.points < purchaseData.totalCost) throw "Insufficient points.";

                    for (const item of purchaseData.items) {
                        const itemRef = doc(db, `artifacts/${appId}/public/data/inventory`, item.id);
                        const itemDoc = await transaction.get(itemRef);
                        if (!itemDoc.exists() || itemDoc.data().stock < item.quantity) {
                            throw `Insufficient stock for ${item.name}.`;
                        }
                        transaction.update(itemRef, { stock: itemDoc.data().stock - item.quantity });
                    }
                    transaction.update(userRef, { points: userData.points - purchaseData.totalCost });
                }
                
                transaction.update(purchaseRef, { status: isApproved ? 'approved' : 'rejected' });
            });
            showNotification(`Purchase ${isApproved ? 'approved' : 'rejected'} successfully.`, 'success');
        } catch (error) {
            console.error("Transaction failed: ", error);
            showNotification(`Error: ${error.toString()}`, 'error');
        }
    }
  };

  // --- Render Logic ---
  if (isLoading || !isAuthReady) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-700">
            <Loader2 className="animate-spin h-12 w-12 mr-3" />
            <span className="text-xl">Loading Pinnacle Perks...</span>
        </div>
    );
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
const Modal = () => {
    const context = useContext(AppContext);
    // Guard against context being undefined during initial renders.
    if (!context || !context.modal || !context.modal.isOpen) {
        return null;
    }
    const { modal, closeModal } = context;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">{modal.title}</h2>
                <p className="text-gray-600 mb-6">{modal.content}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            modal.onConfirm();
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

const Login = () => {
  const context = useContext(AppContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if(context && context.handleLogin) {
        context.handleLogin(username, password);
    } else {
        console.error("Login context is not available.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
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
        <div className="text-center text-xs text-gray-500 mt-4">
            <p>Admin Login: admin / 1nTu1tu53r</p>
            <p>Employee Login: alice / password123</p>
        </div>
      </div>
    </div>
  );
};

const Notification = () => {
    const context = useContext(AppContext);
    if (!context || !context.notification || !context.notification.show) return null;
    const { notification } = context;

    const baseStyle = "fixed top-5 right-5 z-50 p-4 rounded-lg shadow-lg text-white max-w-sm flex items-center";
    const typeStyles = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };

    return (
        <div className={`${baseStyle} ${typeStyles[notification.type]}`}>
            {notification.type === 'success' && <CheckCircle className="mr-3" />}
            {notification.type === 'error' && <XCircle className="mr-3" />}
            {notification.message}
        </div>
    );
};

const Navbar = () => {
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
              <img className="h-8 w-8 rounded-full object-cover" src={loggedInUser.pictureUrl} alt={loggedInUser.username} />
              <span className="ml-2 text-gray-700 text-sm font-medium hidden md:block">{loggedInUser.username}</span>
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
    const { inflation } = useContext(AppContext);
    if (inflation === 0) return null;
    const color = inflation > 0 ? 'bg-red-500' : 'bg-green-500';
    const text = inflation > 0 ? `Inflation Alert: Prices are ${inflation}% higher` : `Deflation: Prices are ${Math.abs(inflation)}% lower`;

    return (
        <div className={`w-full p-2 text-center text-white text-sm font-semibold ${color}`}>
            {text}
        </div>
    );
};

const PriceDisplay = ({ originalPrice }) => {
    const { inflation, getPriceWithInflation } = useContext(AppContext);
    const adjustedPrice = getPriceWithInflation(originalPrice);

    if (inflation === 0 || originalPrice === adjustedPrice) {
        return <p className="text-lg font-bold text-orange-500">{originalPrice.toLocaleString()} <span className="text-sm font-normal">PP</span></p>;
    }

    return (
        <div className="flex items-baseline gap-2">
             <p className="text-gray-500 line-through text-sm">{originalPrice.toLocaleString()} PP</p>
            <p className="text-lg font-bold text-orange-500">{adjustedPrice.toLocaleString()} <span className="text-sm font-normal">PP</span></p>
        </div>
    );
};


const StorePage = () => {
    const { inventory, addToCart } = useContext(AppContext);
    return (
        <div>
            <Leaderboard />
            <h1 className="text-3xl font-bold text-gray-800 mb-6 mt-8">Welcome to the Store</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {inventory.map(item => (
                    <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 flex flex-col">
                        <img className="w-full h-48 object-cover" src={item.pictureUrl} alt={item.name} onError={(e) => { e.target.onerror = null; e.target.src=`https://placehold.co/300x300/F5F5F5/4A4A4A?text=Image+Error`; }}/>
                        <div className="p-4 flex flex-col flex-grow">
                            <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
                            <p className="text-sm text-gray-600 mt-1 flex-grow">{item.description}</p>
                            <div className="mt-4">
                                <PriceDisplay originalPrice={item.price} />
                                <p className="text-xs text-gray-500">{item.stock} left in stock</p>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50">
                            <button onClick={() => addToCart(item.id)} disabled={item.stock === 0} className="w-full bg-orange-500 text-white font-bold py-2 px-4 rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                                {item.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CartPage = () => {
    const { cart, inventory, getPriceWithInflation, inflation, updateCartQuantity, handlePurchaseRequest, isAdmin, users, loggedInUser } = useContext(AppContext);
    const [checkoutForUser, setCheckoutForUser] = useState(loggedInUser.id);

    const cartItems = Object.entries(cart).map(([itemId, quantity]) => {
            const item = inventory.find(i => i.id === itemId);
            if (!item) return null;
            return { ...item, quantity };
        }).filter(Boolean);

    const subtotal = cartItems.reduce((acc, item) => acc + getPriceWithInflation(item.price) * item.quantity, 0);

    const handleCheckout = () => handlePurchaseRequest(isAdmin ? checkoutForUser : loggedInUser.id);
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Cart</h1>
            {cartItems.length === 0 ? <p className="text-gray-600">Your cart is empty.</p> : (
                <div>
                    <div className="space-y-4">
                        {cartItems.map(item => {
                            const adjustedPrice = getPriceWithInflation(item.price);
                            return (
                                <div key={item.id} className="flex items-center justify-between border-b pb-4">
                                    <div className="flex items-center"><img src={item.pictureUrl} alt={item.name} className="h-20 w-20 rounded-md object-cover mr-4" />
                                        <div><h3 className="font-semibold text-lg">{item.name}</h3>
                                            <div className="flex items-baseline gap-2">
                                                {inflation !== 0 && adjustedPrice !== item.price && <p className="text-gray-500 line-through text-sm">{item.price.toLocaleString()} PP</p>}
                                                <p className="text-gray-600">{adjustedPrice.toLocaleString()} PP</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center border rounded-md">
                                            <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)} className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-l-md"><MinusCircle size={16}/></button>
                                            <span className="px-4 py-1 font-semibold">{item.quantity}</span>
                                            <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)} className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-r-md"><PlusCircle size={16}/></button>
                                        </div>
                                        <p className="font-semibold w-24 text-right">{(adjustedPrice * item.quantity).toLocaleString()} PP</p>
                                        <button onClick={() => updateCartQuantity(item.id, 0)} className="text-red-500 hover:text-red-700"><XCircle size={20}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-6 text-right">
                        <p className="text-2xl font-bold">Total: {subtotal.toLocaleString()} PP</p>
                        {isAdmin && (
                            <div className="mt-4 flex justify-end items-center gap-2">
                                <label htmlFor="checkoutUser" className="text-sm font-medium">Checkout for Employee:</label>
                                <select id="checkoutUser" value={checkoutForUser} onChange={e => setCheckoutForUser(e.target.value)} className="p-2 border rounded-md">
                                    <option value={loggedInUser.id}>Myself (admin)</option>
                                    {users.filter(u => u.role === 'employee').map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                                </select>
                            </div>
                        )}
                        <button onClick={handleCheckout} className="mt-4 bg-orange-500 text-white font-bold py-3 px-8 rounded-md hover:bg-orange-600 transition-colors">
                            {isAdmin && checkoutForUser !== loggedInUser.id ? `Checkout for Employee` : `Request Purchase`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ProfilePage = () => {
    const { loggedInUser, updateUser, purchases, showNotification } = useContext(AppContext);
    const fileInputRef = useRef(null);

    const handlePictureChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateUser({ ...loggedInUser, pictureUrl: reader.result });
                showNotification('Profile picture updated!', 'success');
            };
            reader.readAsDataURL(file);
        } else {
            showNotification('Please select a valid image file.', 'error');
        }
    };

    const approvedPurchases = purchases.filter(p => p.userId === loggedInUser.id && p.status === 'approved').sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
                <div className="relative group">
                    <img src={loggedInUser.pictureUrl} alt="Profile" className="h-40 w-40 rounded-full object-cover border-4 border-orange-500" onError={(e) => { e.target.onerror = null; e.target.src=`https://placehold.co/100x100/CCCCCC/FFFFFF?text=Error`; }}/>
                    <button onClick={() => fileInputRef.current.click()} className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={40} />
                    </button>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePictureChange} className="hidden" />
                </div>
                <h2 className="mt-4 text-3xl font-bold">{loggedInUser.username}</h2>
                <p className="text-gray-500 capitalize">{loggedInUser.role}</p>
                <div className="mt-6 bg-orange-100 text-orange-700 p-4 rounded-lg text-center w-full">
                    <p className="text-lg">Available Balance</p>
                    <p className="text-4xl font-bold">{loggedInUser.points.toLocaleString()} PP</p>
                </div>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-2xl font-bold mb-4">Last 3 Approved Purchases</h3>
                {approvedPurchases.length > 0 ? (
                    <div className="space-y-4">
                        {approvedPurchases.map(purchase => (
                            <div key={purchase.id} className="border p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-semibold text-gray-700">Order from {new Date(purchase.date).toLocaleDateString()}</p>
                                    <p className="font-bold text-lg text-orange-500">-{purchase.totalCost.toLocaleString()} PP</p>
                                </div>
                                <ul className="list-disc list-inside text-sm text-gray-600">
                                    {purchase.items.map(item => <li key={item.id}>{item.name} (x{item.quantity}) @ {item.purchasePrice.toLocaleString()} PP each</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-gray-500">No approved purchases yet.</p>}
            </div>
            <div className="lg:col-span-3"><Leaderboard /></div>
        </div>
    );
};

const Leaderboard = () => {
    const { users } = useContext(AppContext);
    const topEmployees = [...users].filter(u => u.role === 'employee').sort((a, b) => b.points - a.points).slice(0, 10);

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-2xl font-bold mb-4 flex items-center"><BarChart2 className="mr-2 text-orange-500"/> Top 10 Employees by Points</h3>
            <ol className="space-y-3">
                {topEmployees.map((user, index) => (
                    <li key={user.id} className="flex items-center justify-between p-2 rounded-md transition-colors hover:bg-gray-50">
                        <div className="flex items-center">
                            <span className="font-bold text-lg w-8 text-gray-500">{index + 1}.</span>
                            <img src={user.pictureUrl} alt={user.username} className="h-10 w-10 rounded-full object-cover mr-3" />
                            <span className="font-medium">{user.username}</span>
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
    const { inventory, updateItem, addItem, deleteItem, showModal, showNotification } = useContext(AppContext);
    const [editingItem, setEditingItem] = useState(null);

    const handleSave = () => {
        updateItem(editingItem);
        setEditingItem(null);
    };

    const handleAddNewItem = () => {
      const newItem = { id: `item-${Date.now()}`, name: 'New Item', description: 'New Description', price: 100, stock: 10, pictureUrl: 'https://placehold.co/300x300/F5F5F5/4A4A4A?text=New' };
      addItem(newItem);
    };
    
    const handleDelete = (itemId, itemName) => showModal('Delete Item', `Are you sure you want to delete "${itemName}"? This action cannot be undone.`, () => deleteItem(itemId));

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
        const csvContent = "data:text/csv;charset=utf-8," + "id,name,description,price,stock\n";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "inventory_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCSVUpload = (e) => {
      showNotification('CSV Upload is a placeholder. A server function is required for a full implementation.', 'info');
    };

    return (
        <AdminPageContainer title="Inventory Management" icon={<Box className="mr-3"/>}>
            <div className="mb-4 flex items-center gap-4 flex-wrap">
                <button onClick={handleAddNewItem} className="bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 flex items-center"><PlusCircle size={18} className="mr-2"/>Add New Item</button>
                <button onClick={downloadCSVTemplate} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors flex items-center"><Download size={18} className="mr-2"/>Download Template</button>
                <label className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors flex items-center cursor-pointer">
                  <Upload size={18} className="mr-2"/>Upload CSV
                  <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                </label>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr><th className="px-6 py-3">Item</th><th className="px-6 py-3">Description</th><th className="px-6 py-3">Price</th><th className="px-6 py-3">Stock</th><th className="px-6 py-3">Actions</th></tr>
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
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <button onClick={() => setEditingItem({...item})} className="p-2 text-blue-600 hover:text-blue-800"><Edit size={20}/></button>
                                    <button onClick={() => handleDelete(item.id, item.name)} className="p-2 text-red-600 hover:text-red-800"><XCircle size={20}/></button>
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
    const { users, updateUser, addUser, deleteUser, showModal, showNotification } = useContext(AppContext);
    const [pointsToAdd, setPointsToAdd] = useState({});

    const handleAddPoints = (user) => {
        const amount = Number(pointsToAdd[user.id] || 0);
        if (amount === 0) return;
        updateUser({ ...user, points: user.points + amount });
        setPointsToAdd(prev => ({...prev, [user.id]: ''}));
        showNotification(`${amount} points added to ${user.username}`, 'success');
    };
    
    const handleAddNewUser = () => {
        const newUser = { username: 'new.user', password: 'password123', role: 'employee', points: 0, pictureUrl: `https://placehold.co/100x100/4A90E2/FFFFFF?text=N` };
        addUser(newUser);
    };
    
    const handleDelete = (userId, username) => {
        if(users.find(u => u.id === userId)?.role === 'admin') {
            showNotification('Cannot delete an admin user.', 'error');
            return;
        }
        showModal('Delete User', `Are you sure you want to delete ${username}?`, () => deleteUser(userId));
    };
    
    const createDownloadLink = (content, filename) => {
        const encodedUri = encodeURI(content);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadPointsCSV = () => {
        const csvContent = "data:text/csv;charset=utf-8," + "id,username,points_to_add\n";
        createDownloadLink(csvContent, "points_update_template.csv");
    };
    
    const handleCSVUpload = () => showNotification('CSV Upload is a placeholder.', 'info');

    return (
        <AdminPageContainer title="Employee Management" icon={<Users className="mr-3"/>}>
            <div className="mb-4 flex items-center gap-4 flex-wrap">
                <button onClick={handleAddNewUser} className="bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 flex items-center"><UserPlus size={18} className="mr-2"/>Add New Employee</button>
                <button onClick={downloadPointsCSV} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors flex items-center"><Download size={18} className="mr-2"/>Download Points Template</button>
                <label className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors flex items-center cursor-pointer">
                  <Upload size={18} className="mr-2"/>Upload Points Update
                  <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                </label>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Points</th><th className="px-6 py-3">Add/Deduct</th><th className="px-6 py-3">Actions</th></tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 flex items-center gap-3"><img src={user.pictureUrl} alt={user.username} className="w-10 h-10 rounded-full object-cover"/>{user.username}</td>
                                <td className="px-6 py-4 capitalize">{user.role}</td>
                                <td className="px-6 py-4 font-semibold">{user.points.toLocaleString()}</td>
                                <td className="px-6 py-4">
                                    {user.role === 'employee' && (
                                      <div className="flex items-center">
                                          <input type="number" placeholder="e.g., 500" className="p-1 border rounded-l-md w-32" value={pointsToAdd[user.id] || ''} onChange={e => setPointsToAdd(prev => ({...prev, [user.id]: e.target.value}))}/>
                                          <button onClick={() => handleAddPoints(user)} className="bg-orange-500 text-white p-2 rounded-r-md hover:bg-orange-600"><PlusCircle size={16}/></button>
                                      </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {user.role !== 'admin' && <button onClick={() => handleDelete(user.id, user.username)} className="p-2 text-red-600 hover:text-red-800"><XCircle size={20}/></button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminPageContainer>
    );
};

const ApprovalQueue = () => {
    const { purchases, handleApproval } = useContext(AppContext);
    const pendingPurchases = purchases.filter(p => p.status === 'pending');

    return (
        <AdminPageContainer title="Approval Queue" icon={<CheckCircle className="mr-3"/>}>
            {pendingPurchases.length === 0 ? <p>No pending approvals.</p> : (
                <div className="space-y-4">
                    {pendingPurchases.map(p => (
                        <div key={p.id} className="border rounded-lg p-4 shadow-sm bg-gray-50">
                            <div className="flex justify-between items-start">
                                <div><p className="font-bold text-lg">{p.username}</p><p className="text-sm text-gray-500">On: {new Date(p.date).toLocaleString()}</p></div>
                                <div className="text-right"><p className="font-bold text-xl text-orange-500">{p.totalCost.toLocaleString()} PP</p></div>
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
                    ))}
                </div>
            )}
        </AdminPageContainer>
    );
};

const SettingsPage = () => {
    const { inflation, setInflation: setGlobalInflation, showNotification } = useContext(AppContext);
    const [localInflation, setLocalInflation] = useState(inflation);

    const handleSave = () => {
        setGlobalInflation(Number(localInflation));
        showNotification('Settings saved successfully!', 'success');
    };

    return (
        <AdminPageContainer title="Global Settings" icon={<Settings className="mr-3"/>}>
            <div className="p-6 border rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Global Inflation Rate</h3>
                <p className="text-sm text-gray-600 mb-4">Set a global percentage to increase or decrease all item prices. Use a negative number for deflation.</p>
                <div className="flex items-center gap-4">
                    <input type="number" value={localInflation} onChange={e => setLocalInflation(e.target.value)} className="p-2 border rounded-md w-40"/>
                    <span className="text-xl font-semibold">%</span>
                </div>
            </div>
            <div className="flex justify-end mt-6">
                <button onClick={handleSave} className="bg-orange-500 text-white font-bold py-3 px-6 rounded-md hover:bg-orange-600 transition-colors">Save Settings</button>
            </div>
        </AdminPageContainer>
    );
};

const Footer = () => (
    <footer className="bg-white mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Pinnacle Perks. A demonstration app.</p>
        </div>
    </footer>
);

export default App;
