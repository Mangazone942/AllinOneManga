import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, serverTimestamp, query, orderBy, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDQlYCcHLrUoyjLGzk9hjrQUAE_q5fLWHs",
    authDomain: "mangabyax.firebaseapp.com",
    projectId: "mangabyax",
    storageBucket: "mangabyax.firebasestorage.app",
    appId: "1:974159756281:web:228c23b929f377544b1b28"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let u = null, allData = [];

// 🌟 Auth & Gold Real-time Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        u = user;
        onSnapshot(doc(db, "users", u.uid), (snap) => {
            if(snap.exists()) document.getElementById('uCoins').innerText = snap.data().coins || 0;
        });
        document.getElementById('uName').innerText = u.email.split('@')[0].toUpperCase();
        document.getElementById('lBtn').style.display = 'none';
    }
});

// 🌟 Load All Content
async function init() {
    const [mSnap, aSnap] = await Promise.all([
        getDocs(query(collection(db, "chapters"), orderBy("timestamp", "desc"))),
        getDocs(collection(db, "animes"))
    ]);
    allData = [
        ...mSnap.docs.map(d => ({ id: d.id, type: 'Manga', ...d.data() })),
        ...aSnap.docs.map(d => ({ id: d.id, type: 'Anime', ...d.data() }))
    ];
    renderHome(allData);
}

function renderHome(data) {
    const grid = document.getElementById('mg');
    const unique = {};
    data.forEach(item => {
        const key = item.seriesName || item.title;
        if (!unique[key]) unique[key] = item;
    });
    grid.innerHTML = Object.values(unique).map(v => `
        <div class="card" onclick="openDetail('${(v.seriesName || v.title).replace(/'/g, "\\'")}', '${v.type}')">
            <img src="${v.coverUrl || v.cover}" loading="lazy">
            <div style="padding:12px; text-align:center;">
                <p style="font-size:10px; color:var(--p); font-weight:800;">${v.type.toUpperCase()}</p>
                <h4 style="font-size:13px; margin-top:5px;">${v.seriesName || v.title}</h4>
            </div>
        </div>
    `).join('');
}

// 🌟 DELETE SYSTEM (The Core Feature)
window.deleteContent = async (id, type) => {
    if (confirm("ဒီ Item ကို ဖျက်မှာ သေချာလား? ပြန်ယူလို့ မရဘူးနော်!")) {
        try {
            const collectionName = type === 'Manga' ? "chapters" : "animes";
            await deleteDoc(doc(db, collectionName, id));
            alert("ဖျက်ပြီးပါပြီ!");
            location.reload(); // Refresh to update list
        } catch (e) {
            alert("Error deleting: " + e.message);
        }
    }
};

// 🌟 Admin Panel Management List
window.oAdm = (type) => {
    document.getElementById('mT').style.display = type === 'm' ? 'block' : 'none';
    document.getElementById('aT').style.display = type === 'a' ? 'block' : 'none';
    document.getElementById('kT').style.display = type === 'k' ? 'block' : 'none';
    document.getElementById('dT').style.display = type === 'd' ? 'block' : 'none';
    
    if (type === 'd') {
        const listDiv = document.getElementById('delList');
        // Manga ရော Anime ရော List အကုန်ပြမယ်
        listDiv.innerHTML = allData.map(item => `
            <div class="del-item">
                <div>
                    <p style="font-size:13px; font-weight:600;">${item.seriesName || item.title}</p>
                    <p style="font-size:10px; opacity:0.5;">Type: ${item.type} | ID: ${item.id}</p>
                </div>
                <div class="del-btn" onclick="deleteContent('${item.id}', '${item.type}')">
                    <i class="fa-solid fa-trash-can"></i>
                </div>
            </div>
        `).join('');
    }
    document.getElementById('adm').style.display = 'block';
};

// ... (Other functions like hA, uM, rk, etc. remain same as before)

init();
