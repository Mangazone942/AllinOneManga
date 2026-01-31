import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, serverTimestamp, query, orderBy, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase Configuration (အရင်အတိုင်းပဲ)
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

let u = null, allData = [], currentID = "";

// Auth State Monitor
onAuthStateChanged(auth, async (user) => {
    if (user) {
        u = user;
        const userRef = doc(db, "users", u.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            await setDoc(userRef, { coins: 0, bookmarks: [] });
        }
        document.getElementById('uCard').style.display = 'block';
        document.getElementById('lBtn').style.display = 'none';
        document.getElementById('uName').innerText = u.email.split('@')[0].toUpperCase();
        updateGoldUI();
        loadChats();
    }
});

async function updateGoldUI() {
    const d = await getDoc(doc(db, "users", u.uid));
    document.getElementById('uCoins').innerText = d.data().coins || 0;
}

// Initial Data Load
async function init() {
    const [mangaSnap, animeSnap] = await Promise.all([
        getDocs(query(collection(db, "chapters"), orderBy("timestamp", "desc"))),
        getDocs(collection(db, "animes"))
    ]);
    allData = [
        ...mangaSnap.docs.map(d => ({ id: d.id, type: 'Manga', ...d.data() })),
        ...animeSnap.docs.map(d => ({ id: d.id, type: 'Anime', ...d.data() }))
    ];
    renderHome(allData);
    if (allData.length > 0) renderSlider(allData.filter(x => x.type === 'Manga').slice(0, 5));
}

function renderHome(data) {
    const uniqueSeries = {};
    data.forEach(item => {
        const key = item.seriesName || item.title;
        if (!uniqueSeries[key]) uniqueSeries[key] = item;
    });
    document.getElementById('mg').innerHTML = Object.values(uniqueSeries).map(v => `
        <div class="card" onclick="openDetail('${(v.seriesName || v.title).replace(/'/g, "\\'")}', '${v.type}')">
            <img src="${v.coverUrl || v.cover}" loading="lazy">
            <div class="card-title">${v.seriesName || v.title}</div>
        </div>
    `).join('');
}

// Global Functions (Window object မှာ ချိတ်ပေးမှ HTML က လှမ်းခေါ်လို့ရမယ်)
window.hSearch = () => {
    const q = document.getElementById('gSearch').value.toLowerCase();
    renderHome(allData.filter(i => (i.seriesName || i.title).toLowerCase().includes(q)));
};

window.openDetail = (name, type) => {
    currentID = name;
    const items = allData.filter(i => (i.seriesName || i.title) === name);
    document.getElementById('dh').innerHTML = `
        <div style="display:flex; gap:15px; margin-top:20px;">
            <img src="${items[0].coverUrl || items[0].cover}" style="width:110px; border-radius:12px; border:1px solid var(--g);">
            <div>
                <h2 style="font-weight:800; color:var(--p);">${name}</h2>
                <p style="opacity:0.6; font-size:12px; margin-top:5px;">${items[0].genre || type}</p>
                <button class="btn-p" onclick="toggleBookmark()" style="padding:8px 15px; width:auto; font-size:11px; margin-top:15px;">
                    <i class="fa-regular fa-bookmark"></i> SAVE TO LIST
                </button>
            </div>
        </div>`;
    
    document.getElementById('cl').innerHTML = type === 'Manga' ? 
        items.map(c => `
            <div onclick="readManga('${c.id}')" style="background:var(--g); padding:16px; border-radius:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:600;">Chapter ${c.chapterNum}</span>
                <i class="fa-solid fa-crown" style="color:var(--p); font-size:12px;"></i>
            </div>`).join('') :
        items[0].episodes.map(e => `
            <div onclick="watchAnime('${e.url}','${e.name}')" style="background:var(--g); padding:16px; border-radius:12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <span>${e.name}</span>
                <i class="fa-solid fa-play" style="color:var(--p)"></i>
            </div>`).join('');
    
    document.getElementById('dp').style.display = 'block';
};

window.readManga = async (id) => {
    if (!u) return toggleModal('authModal');
    const chapter = allData.find(x => x.id === id);
    const userRef = doc(db, "users", u.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.data().coins < (chapter.coinPrice || 0)) return alert("Gold မလောက်ပါ။ VIP Key ဖြည့်ပေးပါ။");
    
    if (chapter.coinPrice > 0) {
        await updateDoc(userRef, { coins: userSnap.data().coins - chapter.coinPrice });
        updateGoldUI();
    }
    
    document.getElementById('vt').innerText = `Chapter ${chapter.chapterNum}`;
    document.getElementById('vc').innerHTML = chapter.chapterImages.map(img => `<img src="${img}" style="width:100%; display:block;">`).join('');
    document.getElementById('vp').style.display = 'block';
};

window.watchAnime = (url, name) => {
    document.getElementById('vt').innerText = name;
    document.getElementById('vc').innerHTML = `<iframe src="${url}" style="width:100%; height:280px; border:none;" allowfullscreen></iframe>`;
    document.getElementById('vp').style.display = 'block';
};

// Admin Functions
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ml_default");
    const res = await fetch("https://api.cloudinary.com/v1_1/dqdqg2ac/upload", { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url;
}

window.uM = async () => {
    const cover = await uploadToCloudinary(document.getElementById('mCv').files[0]);
    const pages = await Promise.all(Array.from(document.getElementById('mPs').files).map(f => uploadToCloudinary(f)));
    await addDoc(collection(db, "chapters"), {
        seriesName: document.getElementById('mt').value,
        chapterNum: parseFloat(document.getElementById('mc').value),
        coinPrice: parseInt(document.getElementById('mp').value),
        genre: document.getElementById('mgS').value,
        coverUrl: cover,
        chapterImages: pages,
        timestamp: serverTimestamp()
    });
    location.reload();
};

window.rk = async () => {
    const key = document.getElementById('vKey').value;
    const q = query(collection(db, "keys"), where("key", "==", key), where("used", "==", false));
    const snap = await getDocs(q);
    if (snap.empty) return alert("Key မှားနေသည်");
    const keyDoc = snap.docs[0];
    const userRef = doc(db, "users", u.uid);
    const userSnap = await getDoc(userRef);
    await updateDoc(userRef, { coins: (userSnap.data().coins || 0) + keyDoc.data().amount });
    await updateDoc(doc(db, "keys", keyDoc.id), { used: true });
    alert("Gold Added Successfully!");
    location.reload();
};

// UI Toggles
window.tgS = () => document.getElementById('sb').classList.toggle('active');
window.clP = (id) => document.getElementById(id).style.display = 'none';
window.toggleModal = (id) => {
    const m = document.getElementById(id);
    m.style.display = m.style.display === 'none' ? 'flex' : 'none';
};

window.checkStaff = () => {
    if (prompt("Staff Access Pass:") === "Admin@2026") {
        document.getElementById('staffZone').style.display = 'block';
        alert("Welcome, Staff Member!");
    }
};

window.oAdm = (type) => {
    document.getElementById('mT').style.display = type === 'm' ? 'block' : 'none';
    document.getElementById('aT').style.display = type === 'a' ? 'block' : 'none';
    document.getElementById('kT').style.display = type === 'k' ? 'block' : 'none';
    document.getElementById('dT').style.display = type === 'd' ? 'block' : 'none';
    if (type === 'd') {
        document.getElementById('delList').innerHTML = allData.map(x => `
            <div class="del-item">
                <span style="font-size:12px;">${x.seriesName || x.title} (${x.type})</span>
                <i class="fa-solid fa-trash-can del-btn" onclick="deleteContent('${x.id}', '${x.type}')"></i>
            </div>`).join('');
    }
    document.getElementById('adm').style.display = 'block';
    tgS();
};

window.deleteContent = async (id, type) => {
    if (confirm("Delete this item?")) {
        await deleteDoc(doc(db, type === 'Manga' ? "chapters" : "animes", id));
        location.reload();
    }
};

window.hA = async () => {
    const e = document.getElementById('em').value, p = document.getElementById('ps').value;
    try { await signInWithEmailAndPassword(auth, e, p); location.reload(); }
    catch { await createUserWithEmailAndPassword(auth, e, p); location.reload(); }
};

function renderSlider(s) {
    document.getElementById('st').innerHTML = s.map(x => `<div class="slide"><img src="${x.coverUrl}"></div>`).join('');
    let i = 0; setInterval(() => { i = (i + 1) % s.length; document.getElementById('st').style.transform = `translateX(-${i * 100}%)` }, 5000);
}

init();
