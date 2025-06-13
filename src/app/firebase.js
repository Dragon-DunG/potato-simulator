import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, doc, updateDoc, increment, setDoc, getDoc, getDocs } from "firebase/firestore";

const exp = 400; // 경험치 상승값

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export const signIn = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    console.log("User signed in anonymously:", userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    throw error;
  }
}

export const getUserId = () => {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve(user.uid);
      } else {
        signIn()
          .then((userCredential) => {
            resolve(userCredential.user.uid);
          })
          .catch((error) => {
            console.error("Error signing in:", error);
            reject(error);
          });
      }
    });
  });
}

export const uploadResult = async (userId, resultData) => {
  console.log("current uid", auth.currentUser?.uid);
  console.log("uploadResult", userId, resultData);
  const situationId = resultData.situationData.id;
  const resultsDocRef = doc(db, "users", userId, "results", situationId.toString());
  const recordsCollectionRef = collection(db, "users", userId, "results", situationId.toString(), "records");
  try {
    // 결과 문서가 존재하지 않으면 새로 생성
    await setDoc(resultsDocRef, { createdAt: new Date() }, { merge: true });
    await addDoc(recordsCollectionRef, {
      ...resultData,
      createdAt: new Date(),
    });
    
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, { exp: increment(exp) }).catch(async (error) => {
      if (error.code === 'not-found') {
        // 사용자 문서가 없으면 새로 생성
        await setDoc(userDocRef, { exp: exp }, { merge: true });
      } else {
        console.error("Error updating user experience:", error);
      }
    });
    console.log("Result uploaded successfully:", resultData);
    return true;
  } catch (error) {
    console.error("Error uploading result:", error);
    return false;
  }
};

export const getUserRecords = async (userId) => {
  const resultsCollectionRef = collection(db, "users", userId, "results");
  const userDocRef = doc(db, "users", userId);
  try {
    const userDocSnap = await getDoc(userDocRef);
    const userExp = userDocSnap.exists() ? userDocSnap.data().exp : 0;
    const resultsSnapshot = await getDocs(resultsCollectionRef);
    console.log("resultsSnapshot", resultsSnapshot);

    const idsWithRecords = [];
    for (const docSnap of resultsSnapshot.docs) {
      const recordsCollectionRef = collection(
        db,
        "users",
        userId,
        "results",
        docSnap.id,
        "records"
      );
      const recordsSnapshot = await getDocs(recordsCollectionRef);
      if (!recordsSnapshot.empty) {
        idsWithRecords.push(docSnap.id);
      }
    }

    return { userExp, records: idsWithRecords };
  } catch (error) {
    console.error("Error fetching user records:", error);
    return { userExp: 0, records: [] };
  }
};

export const getSituationRecords = async (userId, situationId) => {
  const recordsCollectionRef = collection(db, "users", userId, "results", situationId.toString(), "records");
  try {
    const querySnapshot = await getDocs(recordsCollectionRef);
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });
    return records;
  } catch (error) {
    console.error("Error fetching situation records:", error);
    return [];
  }
}
