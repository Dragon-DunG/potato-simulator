import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, doc, updateDoc, increment, setDoc, getDoc, getDocs, arrayUnion, runTransaction } from "firebase/firestore";
import { situation_data } from "./data/situationData";

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
    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          // 사용자 문서가 없으면 새로 생성
          transaction.set(userDocRef, { exp: exp, count: 1, doneIds: [situationId] });
        } else {
          // 사용자 문서가 존재하면
          let doneIds = userDoc.data().doneIds || [];
          if (!doneIds.includes(situationId)) {
            doneIds = [...doneIds, situationId];
          }
          const allDone = Array.from(situation_data, (situation) => situation.id).every((id) => doneIds.includes(id));
          if (allDone) {
            // 모든 상황을 완료한 경우
            transaction.update(userDocRef, {
              exp: increment(exp),
              count: increment(1),
              doneIds: [],
            });
          } else {
            // 아직 완료하지 않은 상황이 있는 경우
            transaction.update(userDocRef, {
              exp: increment(exp),
              count: increment(1),
              doneIds: arrayUnion(situationId),
            });
          }
        }
      });
      console.log("User experience updated successfully.");
      return true;
    } catch (error) { // 트랜잭션 에러
      console.error("Error updating user experience in transaction:", error);
      return false;
    }
  } catch (error) { // 결과 업로드 에러
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
    const userCount = userDocSnap.exists() ? userDocSnap.data().count : 0;
    const resultsSnapshot = await getDocs(resultsCollectionRef);
    console.log("resultsSnapshot", resultsSnapshot);
    const userDoneIds = userDocSnap.exists() ? userDocSnap.data().doneIds || [] : [];

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

    return { userExp, records: idsWithRecords, userCount, doneIds: userDoneIds };
  } catch (error) {
    console.error("Error fetching user records:", error);
    return { userExp: 0, records: [], userCount: 0, doneIds: []};
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

export const fetchUserData = async () => {
  const userId = await getUserId();
  if (!userId) {
    console.error("User ID not found.");
    return null;
  }
  const userDocRef = doc(db, "users", userId);
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const userCache = { id: userId, ...userDocSnap.data() };
      console.log("User data cached:", userCache);
      return userCache;
    } else {
      // 사용자 문서가 존재하지 않는 경우 새로 생성
      await setDoc(userDocRef, { exp: 0, count: 0, doneIds: [] });
      console.log("User document created:", userId);
      return { id: userId, exp: 0, count: 0, doneIds: [] };
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

export const getUserDoneIds = async () => {
  const userId = await getUserId();
  const userDocRef = doc(db, "users", userId);
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return userDocSnap.data().doneIds || [];
    } else {
      console.log("User document does not exist.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching user done IDs:", error);
    return [];
  }
}
