import { showAlert } from './custom-alert.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Konfigurasi Firebase Awal Banget
const firebaseConfig = {
  apiKey: "AIzaSyB1Ab-K6ehYQZbjX-QxJQiodqSajGPFdmE",
  authDomain: "pemilihan-ketos-2627.firebaseapp.com",
  projectId: "pemilihan-ketos-2627",
  storageBucket: "pemilihan-ketos-2627.firebasestorage.app",
  messagingSenderId: "924205874158",
  appId: "1:924205874158:web:be0bab0495c02d1182acff"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let myChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadPemilihanDropdown();
  
  const selectEl = document.getElementById('hasil-pemilihan-select');
  if (selectEl) {
    selectEl.addEventListener('change', loadHasilSuaraChart);
  }
});

async function loadPemilihanDropdown() {
  const selectEl = document.getElementById('hasil-pemilihan-select');
  try {
    const snap = await getDocs(collection(db, "pemilihan"));
    if (snap.empty) {
      selectEl.innerHTML = '<option value="">Belum ada event pemilihan</option>';
      return;
    }

    let optionsHtml = '';
    snap.forEach(d => {
      const data = d.data();
      optionsHtml += `<option value="${d.id}">${data.judul}</option>`;
    });

    selectEl.innerHTML = optionsHtml;
    
    // Tampilkan chart untuk event pertama secara otomatis
    if (selectEl.value) {
      loadHasilSuaraChart();
    }
  } catch (error) {
    console.error("Gagal memuat dropdown pemilihan:", error);
    showAlert("Gagal memuat daftar acara pemilihan.", "Error");
  }
}

async function loadHasilSuaraChart() {
  const pemId = document.getElementById('hasil-pemilihan-select').value;
  if (!pemId) return;

  const canvas = document.getElementById('adminBarChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  try {
    const snap = await getDocs(query(collection(db, "candidates"), where("pemilihanId", "==", pemId)));

    let candidates = [];
    snap.forEach(d => candidates.push(d.data()));
    candidates.sort((a, b) => a.noUrut - b.noUrut);

    let labels = candidates.map(c => `No ${c.noUrut} - ${c.nama}`);
    let dataSuara = candidates.map(c => c.suara || 0);

    if (myChart) {
      myChart.destroy();
    }

    myChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Perolehan Suara',
          data: dataSuara,
          backgroundColor: '#1b4f91'
        }]
      },
      options: { 
        responsive: true, 
        scales: { 
          y: { 
            beginAtZero: true, 
            ticks: { stepSize: 1 } 
          } 
        } 
      }
    });
  } catch (error) {
    console.error("Gagal memuat chart hasil suara:", error);
    showAlert("Terjadi kesalahan saat memuat grafik hasil suara.", "Error");
  }
}
