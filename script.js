// Firebase Imports (အရင်အတိုင်း) ...

// Delete Function
window.deleteContent = async (id, type) => {
    if (confirm("ဒီ Item ကို ဖျက်မှာ သေချာလား?")) {
        const col = type === 'Manga' ? "chapters" : "animes";
        await deleteDoc(doc(db, col, id));
        alert("Deleted!");
        location.reload();
    }
};

window.oAdm = (type) => {
    document.querySelectorAll('#adm > div').forEach(d => d.style.display = 'none');
    if (type === 'd') {
        document.getElementById('dT').style.display = 'block';
        document.getElementById('delList').innerHTML = allData.map(item => `
            <div class="del-item">
                <span>${item.seriesName || item.title} (${item.type})</span>
                <i class="fa-solid fa-trash" onclick="deleteContent('${item.id}', '${item.type}')" style="color:red; cursor:pointer;"></i>
            </div>`).join('');
    }
    document.getElementById('adm').style.display = 'block';
};

// Genre Filter Fix
window.fGenre = (g, el) => {
    document.querySelectorAll('.genre-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    renderHome(g === 'All' ? allData : allData.filter(d => d.genre === g));
};

// ... ကျန်တဲ့ Auth နဲ့ Init logic တွေ ထည့်ပါ
