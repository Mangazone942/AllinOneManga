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

let u = null, allData = [], currentID = "";

// 🚀 Performance Tip: Auth နဲ့ Data ကို တစ်ပြိုင်တည်း Load လုပ်မယ်
onAuthStateChanged(auth, async (user) => {
    if (user) {
        u = user;
        const userRef = doc(db, "users", u.uid);
        // Real-time listener သုံးလိုက်ရင် Gold UI က ချက်ချင်းပြောင်းမယ်
        onSnapshot(userRef, (doc) => {
            if(doc.exists()) document.getElementById('uCoins').innerText = doc.data().coins || 0;
        });
        document.getElementById('uCard').style.display = 'block';
        document.getElementById('lBtn').style.display = 'none';
        document.getElementById('uName').innerText = u.email.split('@')[0].toUpperCase();
    }
});

// 🚀 Speed Logic: Data တွေကို Cache လုပ်ပြီး အမြန်ပြမယ်
async function init() {
    // LocalStorage ကနေ အရင်ပြ (အမြန်တက်လာအောင်)
    const cachedData = localStorage.getItem('mzone_data');
    if (cachedData) {
        allData = JSON.parse(cachedData);
        renderHome(allData);
    }

    // နောက်ကွယ်ကနေ Firebase က ဒေတာအသစ်ဆွဲ
    const [mangaSnap, animeSnap] = await Promise.all([
        getDocs(query(collection(db, "chapters"), orderBy("timestamp", "desc"))),
        getDocs(collection(db, "animes"))
    ]);
    
    allData = [
        ...mangaSnap.docs.map(d => ({ id: d.id, type: 'Manga', ...d.data() })),
        ...animeSnap.docs.map(d => ({ id: d.id, type: 'Anime', ...d.data() }))
    ];
    
    localStorage.setItem('mzone_data', JSON.stringify(allData));
    renderHome(allData);
    renderSlider(allData.filter(x => x.type === 'Manga').slice(0, 5));
}

// UI Render - ပိုမြန်အောင် Fragment သုံးမယ်
function renderHome(data) {
    const grid = document.getElementById('mg');
    const uniqueSeries = {};
    data.forEach(item => {
        const key = item.seriesName || item.title;
        if (!uniqueSeries[key]) uniqueSeries[key] = item;
    });
    
    grid.innerHTML = Object.values(uniqueSeries).map(v => `
        <div class="card" onclick="openDetail('${(v.seriesName || v.title).replace(/'/g, "\\'")}', '${v.type}')">
            <div style="position:relative">
                <img src="${v.coverUrl || v.cover}" loading="lazy">
                <div style="position:absolute; bottom:5px; right:5px; background:rgba(0,0,0,0.7); font-size:9px; padding:2px 6px; border-radius:4px; color:var(--p); border:1px solid var(--p)">${v.type}</div>
            </div>
            <div class="card-title">${v.seriesName || v.title}</div>
        </div>
    `).join('');
}

// 🚀 Bookmark & Library Logic (Fix)
window.toggleBookmark = async () => {
    if(!u) return alert("Login အရင်ဝင်ပါ");
    const userRef = doc(db, "users", u.uid);
    const snap = await getDoc(userRef);
    let bks = snap.data().bookmarks || [];
    
    if(bks.includes(currentID)) {
        bks = bks.filter(i => i !== currentID);
        alert("Removed from Library");
    } else {
        bks.push(currentID);
        alert("Added to Library");
    }
    await updateDoc(userRef, { bookmarks: bks });
};

window.showList = async () => {
    if(!u) return alert("Login အရင်ဝင်ပါ");
    const snap = await getDoc(doc(db, "users", u.uid));
    const myBks = snap.data().bookmarks || [];
    renderHome(allData.filter(i => myBks.includes(i.seriesName || i.title)));
    tgS();
};

// 🚀 Anime Upload Fix (Episodes အလုပ်မလုပ်တာ ပြင်ပြီး)
window.aE = () => {
    const div = document.createElement('div');
    div.className = "ep-input-group";
    div.innerHTML = `
        <div style="display:flex; gap:5px; margin-bottom:5px;">
            <input class="en" placeholder="Ep Name (e.g Ep 1)">
            <input class="eu" placeholder="Video Link (Direct/Embed)">
        </div>`;
    document.getElementById('epA').appendChild(div);
};

window.uA = async () => {
    const btn = event.target; btn.innerText = "Uploading..."; btn.disabled = true;
    try {
        const cover = await uploadToCloudinary(document.getElementById('acV').files[0]);
        const eps = Array.from(document.querySelectorAll('.ep-input-group')).map(g => ({
            name: g.querySelector('.en').value,
            url: g.querySelector('.eu').value
        }));
        await addDoc(collection(db, "animes"), {
            title: document.getElementById('at').value,
            cover: cover,
            episodes: eps,
            timestamp: serverTimestamp()
        });
        location.reload();
    } catch (e) { alert("Error!"); btn.innerText = "UPLOAD ANIME"; btn.disabled = false; }
};

// ... (တခြား Logic တွေက အပေါ်က Version အတိုင်းပဲ၊ ဒါပေမဲ့ Function တွေကို Window ထဲ ထည့်ဖို့ မမေ့နဲ့)
window.hSearch = () => {
    const q = document.getElementById('gSearch').value.toLowerCase();
    renderHome(allData.filter(i => (i.seriesName || i.title).toLowerCase().includes(q)));
};

// Helper: Cloudinary (မြန်အောင် Async/Await သေချာသုံးထားတယ်)
async function uploadToCloudinary(file) {
    if(!file) return "";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ml_default");
    const res = await fetch("https://api.cloudinary.com/v1_1/dqdqg2ac/upload", { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url;
}

// UI Toggles
window.tgS = () => document.getElementById('sb').classList.toggle('active');
window.clP = (id) => { 
    document.getElementById(id).style.display = 'none';
    if(id === 'vp') document.getElementById('vc').innerHTML = ""; // Stop video when closing
};
window.oAdm = (type) => { 
    document.querySelectorAll('#adm > div').forEach(d => { if(d.id !== 'adm-btn') d.style.display = 'none'; });
    document.getElementById(type === 'm' ? 'mT' : type === 'a' ? 'aT' : type === 'k' ? 'kT' : 'dT').style.display = 'block';
    if(type === 'd') {
        document.getElementById('delList').innerHTML = allData.map(x => `
            <div class="del-item">
                <span>${x.seriesName || x.title}</span>
                <i class="fa-solid fa-trash" onclick="deleteContent('${x.id}', '${x.type}')" style="color:#ff4d4d; cursor:pointer;"></i>
            </div>`).join('');
    }
    document.getElementById('adm').style.display = 'block';
    tgS();
};

window.checkStaff = () => {
    if (prompt("Staff Access:") === "Admin@2026") {
        document.getElementById('staffZone').style.display = 'block';
        alert("Staff Mode Enabled");
    }
};

window.hA = async () => {
    const e = document.getElementById('em').value, p = document.getElementById('ps').value;
    try { await signInWithEmailAndPassword(auth, e, p); location.reload(); }
    catch { await createUserWithEmailAndPassword(auth, e, p); location.reload(); }
};

function renderSlider(s) {
    const track = document.getElementById('st');
    if(!track) return;
    track.innerHTML = s.map(x => `<div class="slide"><img src="${x.coverUrl}"></div>`).join('');
    let i = 0; setInterval(() => { i = (i + 1) % s.length; track.style.transform = `translateX(-${i * 100}%)` }, 5000);
}

init();
