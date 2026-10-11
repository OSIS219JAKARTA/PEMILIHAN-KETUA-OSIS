import { showAlert } from './custom-alert.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
  const cardsContainer = document.getElementById('hasil-cards-container');
  const totalSuaraDisplay = document.getElementById('total-suara-display');

  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  try {
    const snap = await getDocs(query(collection(db, "candidates"), where("pemilihanId", "==", pemId)));

    let candidates = [];
    let totalSuaraMasuk = 0;

    snap.forEach(d => {
      const data = d.data();
      const suara = data.suara || 0;
      totalSuaraMasuk += suara;
      candidates.push({ ...data, suara: suara });
    });

    candidates.sort((a, b) => a.noUrut - b.noUrut);

    // Hitung persentase untuk masing-masing kandidat
    let labels = candidates.map(c => `No. Urut ${c.noUrut}`);
    let dataPersentase = candidates.map(c => {
      if (totalSuaraMasuk === 0) return 0;
      return parseFloat(((c.suara / totalSuaraMasuk) * 100).toFixed(1));
    });

    if (totalSuaraDisplay) {
      totalSuaraDisplay.innerText = `Total Suara Masuk: ${totalSuaraMasuk} Suara`;
    }

    if (myChart) {
      myChart.destroy();
    }

    myChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Persentase Suara (%)',
          data: dataPersentase,
          backgroundColor: '#1b4f91',
          borderRadius: 6
        }]
      },
      options: { 
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                const index = context.dataIndex;
                const rawVote = candidates[index].suara;
                return `${context.parsed.y}% (${rawVote} suara)`;
              }
            }
          }
        },
        scales: { 
          y: { 
            beginAtZero: true,
            max: 100,
            ticks: { 
              callback: function(value) {
                return value + "%";
              }
            } 
          } 
        } 
      }
    });

    // Tampilkan Kartu Foto Paslon & Hasil Persentase
    if (cardsContainer) {
      cardsContainer.innerHTML = '';
      candidates.forEach(c => {
        const imagePath = c.foto && c.foto.trim() !== '' ? c.foto : `Assets/img/paslon${c.noUrut}.jpg`;
        const persentase = totalSuaraMasuk > 0 ? ((c.suara / totalSuaraMasuk) * 100).toFixed(1) : 0;
        
        cardsContainer.innerHTML += `
          <div class="hasil-card">
            <img src="${imagePath}" onError="this.src='Assets/img/logo_osis.png'" alt="Foto Paslon">
            <h4 style="margin: 5px 0;">No. Urut ${c.noUrut}</h4>
            <p style="font-size: 0.95rem; font-weight: bold; margin: 5px 0; color: #333;">${c.nama}</p>
            <div class="percentage-badge">${persentase}%</div>
          </div>
        `;
      });
    }

  } catch (error) {
    console.error("Gagal memuat chart hasil suara:", error);
    showAlert("Terjadi kesalahan saat memuat grafik hasil suara.", "Error");
  }
}
