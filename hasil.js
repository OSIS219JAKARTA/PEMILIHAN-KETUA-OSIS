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

let publicChart = null;

async function loadDropdown() {
  const select = document.getElementById('public-pemilihan-select');
  const snap = await getDocs(collection(db, "pemilihan"));
  
  if(snap.empty) {
    select.innerHTML = '<option>Tidak ada acara aktif</option>';
    return;
  }
  
  snap.forEach(d => {
    select.innerHTML += `<option value="${d.id}">${d.data().judul}</option>`;
  });

  loadPublicChart();
}

document.getElementById('public-pemilihan-select').addEventListener('change', loadPublicChart);

async function loadPublicChart() {
  const pemId = document.getElementById('public-pemilihan-select').value;
  if(!pemId || pemId === 'Tidak ada acara aktif') return;

  const ctx = document.getElementById('publicBarChart').getContext('2d');
  const snap = await getDocs(query(collection(db, "candidates"), where("pemilihanId", "==", pemId)));
  
  let candidates = [];
  snap.forEach(d => candidates.push(d.data()));
  candidates.sort((a,b) => a.noUrut - b.noUrut); // Urutkan nomor paslon

  let labels = candidates.map(c => `No ${c.noUrut} - ${c.nama}`);
  let dataSuara = candidates.map(c => c.suara || 0);

  if(publicChart) publicChart.destroy();

  publicChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Jumlah Suara',
        data: dataSuara,
        backgroundColor: '#1b4f91', // Warna logo OSIS
        borderColor: '#0d234a',
        borderWidth: 1
      }]
    },
    options: { 
      responsive: true, 
      scales: { 
        y: { 
          beginAtZero: true, 
          ticks: { stepSize: 1 } 
        } 
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// Inisiasi awal saat halaman dibuka
loadDropdown();
